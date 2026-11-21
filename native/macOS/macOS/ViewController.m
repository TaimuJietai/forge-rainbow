#import "ViewController.h"
#import <QuartzCore/QuartzCore.h>
#import <WebKit/WebKit.h>

static NSTimeInterval const kOverlayFadeDuration = 0.35;
static CGFloat const kSplashLogoSide = 160.0;
static CGFloat const kWindowScreenRatio = 0.70;
static NSString * const kFallbackHomeURL = @"https://dv.phb.plus/";
/** 与 hybrid-jssdk webViewHost / jssdk api-names 对齐 */
static NSString * const kWebViewHostBridgeName = @"kWHScriptHandlerName";

@interface ViewController () <WKNavigationDelegate, WKScriptMessageHandler>
@property (nonatomic, strong) WKWebView *webView;
@property (nonatomic, strong) NSView *coverOverlay;
@property (nonatomic, strong) NSImageView *logoView;
@property (nonatomic, strong) NSProgressIndicator *loadingIndicator;
@property (nonatomic, assign) BOOL didShowLoading;
@property (nonatomic, assign) BOOL didDismissCover;
@property (nonatomic, assign) BOOL didConfigureWindow;
@property (nonatomic, copy) NSString *homeURLString;
@property (nonatomic, strong) NSSet<NSString *> *allowedHosts;
@end

@implementation ViewController

- (void)viewDidLoad {
    [super viewDidLoad];

    NSColor *background = [NSColor colorNamed:@"LaunchBackground"];
    if (!background) {
        background = [NSColor colorWithRed:212.0 / 255.0
                                     green:222.0 / 255.0
                                      blue:230.0 / 255.0
                                     alpha:1.0];
    }
    self.view.wantsLayer = YES;
    self.view.layer.backgroundColor = background.CGColor;

    [self loadWebViewConfiguration];
    [self setupWebView];
    [self setupCoverOverlayWithBackground:background];
}

- (void)viewDidAppear {
    [super viewDidAppear];
    [self configureWindowSizeIfNeeded];
}

- (void)configureWindowSizeIfNeeded {
    if (self.didConfigureWindow) {
        return;
    }
    NSWindow *window = self.view.window;
    NSScreen *screen = window.screen ?: NSScreen.mainScreen;
    if (!window || !screen) {
        return;
    }
    self.didConfigureWindow = YES;

    NSRect visible = screen.visibleFrame;
    CGFloat width = visible.size.width * kWindowScreenRatio;
    CGFloat height = visible.size.height * kWindowScreenRatio;
    NSRect frame = NSMakeRect(0, 0, width, height);
    frame.origin.x = NSMidX(visible) - width / 2.0;
    frame.origin.y = NSMidY(visible) - height / 2.0;

    window.title = @"彩虹锻造";
    [window setFrame:frame display:YES animate:NO];
    [window makeKeyAndOrderFront:nil];
}

- (nullable NSString *)pathForBundledResource:(NSString *)name
                                       ofType:(NSString *)type
                                  inDirectory:(NSString *)directory {
    // Xcode synchronized groups often flatten folder resources into Resources/.
    NSString *path = [[NSBundle mainBundle] pathForResource:name
                                                     ofType:type
                                                inDirectory:directory];
    if (!path) {
        path = [[NSBundle mainBundle] pathForResource:name ofType:type];
    }
    return path;
}

- (void)loadWebViewConfiguration {
    self.homeURLString = kFallbackHomeURL;
    self.allowedHosts = [NSSet setWithArray:@[ @"dv.phb.plus", @"cdn.phb.plus" ]];

    NSString *path = [self pathForBundledResource:@"webview"
                                           ofType:@"json"
                                      inDirectory:@"configuration"];
    if (!path) {
        NSLog(@"[rainbow] webview.json not found in bundle; using fallback URL");
        return;
    }

    NSData *data = [NSData dataWithContentsOfFile:path];
    if (!data) {
        return;
    }

    NSError *error = nil;
    id json = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    if (error || ![json isKindOfClass:[NSDictionary class]]) {
        return;
    }

    NSDictionary *dict = (NSDictionary *)json;
    NSString *url = dict[@"url"];
    if ([url isKindOfClass:[NSString class]] && url.length > 0) {
        self.homeURLString = url;
    }

    NSArray *hosts = dict[@"allowedHosts"];
    if ([hosts isKindOfClass:[NSArray class]] && hosts.count > 0) {
        NSMutableSet<NSString *> *normalized = [NSMutableSet set];
        for (id item in hosts) {
            if ([item isKindOfClass:[NSString class]] && [item length] > 0) {
                [normalized addObject:[(NSString *)item lowercaseString]];
            }
        }
        if (normalized.count > 0) {
            self.allowedHosts = [normalized copy];
        }
    }
}

- (NSString *)bridgeShimScript {
    return @"window.kWHScriptHandlerName={postMessage:function(m){"
           @"window.webkit.messageHandlers.kWHScriptHandlerName.postMessage(m);"
           @"}};";
}

- (nullable NSString *)rainbowInjectionScript {
    // Source path sdk/web-view-host.min.js; built app may keep subdirectory or flatten to Resources/.
    NSString *sdkPath = [self pathForBundledResource:@"web-view-host.min"
                                              ofType:@"js"
                                         inDirectory:@"sdk"];
    if (!sdkPath) {
        NSLog(@"[rainbow] host not found in bundle (web-view-host.min.js)");
        return nil;
    }
    NSError *error = nil;
    NSString *sdk = [NSString stringWithContentsOfFile:sdkPath
                                              encoding:NSUTF8StringEncoding
                                                 error:&error];
    if (error || sdk.length == 0) {
        NSLog(@"[rainbow] failed to read host at %@", sdkPath);
        return nil;
    }
    NSLog(@"[rainbow] injecting web-view-host from %@", sdkPath);
    NSString *boot = @"window.__WVH_BOOT__={platform:'macos'};";
    return [[boot stringByAppendingString:[self bridgeShimScript]] stringByAppendingString:sdk];
}

- (void)setupWebView {
    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    if (@available(macOS 10.12, *)) {
        config.mediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypeNone;
    }

    [config.userContentController addScriptMessageHandler:self name:kWebViewHostBridgeName];

    NSString *injection = [self rainbowInjectionScript];
    if (injection.length > 0) {
        WKUserScript *script = [[WKUserScript alloc] initWithSource:injection
                                                      injectionTime:WKUserScriptInjectionTimeAtDocumentStart
                                                   forMainFrameOnly:YES];
        [config.userContentController addUserScript:script];
    } else {
        NSLog(@"[rainbow] skip UserScript: empty injection");
    }

    self.webView = [[WKWebView alloc] initWithFrame:NSZeroRect configuration:config];
    self.webView.navigationDelegate = self;
    self.webView.translatesAutoresizingMaskIntoConstraints = NO;
    [self.view addSubview:self.webView];

    [NSLayoutConstraint activateConstraints:@[
        [self.webView.topAnchor constraintEqualToAnchor:self.view.topAnchor],
        [self.webView.bottomAnchor constraintEqualToAnchor:self.view.bottomAnchor],
        [self.webView.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor],
        [self.webView.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor],
    ]];

    NSURL *url = [NSURL URLWithString:self.homeURLString];
    if (url) {
        [self.webView loadRequest:[NSURLRequest requestWithURL:url]];
    }
}

- (void)setupCoverOverlayWithBackground:(NSColor *)background {
    self.coverOverlay = [[NSView alloc] initWithFrame:NSZeroRect];
    self.coverOverlay.wantsLayer = YES;
    self.coverOverlay.layer.backgroundColor = background.CGColor;
    self.coverOverlay.translatesAutoresizingMaskIntoConstraints = NO;
    [self.view addSubview:self.coverOverlay];

    self.logoView = [[NSImageView alloc] initWithFrame:NSZeroRect];
    self.logoView.image = [NSImage imageNamed:@"LaunchLogo"];
    self.logoView.imageScaling = NSImageScaleProportionallyUpOrDown;
    self.logoView.translatesAutoresizingMaskIntoConstraints = NO;
    [self.coverOverlay addSubview:self.logoView];

    self.loadingIndicator = [[NSProgressIndicator alloc] initWithFrame:NSZeroRect];
    self.loadingIndicator.style = NSProgressIndicatorStyleSpinning;
    self.loadingIndicator.displayedWhenStopped = NO;
    self.loadingIndicator.translatesAutoresizingMaskIntoConstraints = NO;
    self.loadingIndicator.alphaValue = 0;
    [self.coverOverlay addSubview:self.loadingIndicator];

    [NSLayoutConstraint activateConstraints:@[
        [self.coverOverlay.topAnchor constraintEqualToAnchor:self.view.topAnchor],
        [self.coverOverlay.bottomAnchor constraintEqualToAnchor:self.view.bottomAnchor],
        [self.coverOverlay.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor],
        [self.coverOverlay.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor],
        [self.logoView.centerXAnchor constraintEqualToAnchor:self.coverOverlay.centerXAnchor],
        [self.logoView.centerYAnchor constraintEqualToAnchor:self.coverOverlay.centerYAnchor],
        [self.logoView.widthAnchor constraintEqualToConstant:kSplashLogoSide],
        [self.logoView.heightAnchor constraintEqualToConstant:kSplashLogoSide],
        [self.loadingIndicator.centerXAnchor constraintEqualToAnchor:self.coverOverlay.centerXAnchor],
        [self.loadingIndicator.centerYAnchor constraintEqualToAnchor:self.coverOverlay.centerYAnchor],
    ]];
}

- (void)showLoadingIfNeeded {
    if (self.didShowLoading || self.didDismissCover || !self.coverOverlay) {
        return;
    }
    self.didShowLoading = YES;

    [self.loadingIndicator startAnimation:nil];
    [NSAnimationContext runAnimationGroup:^(NSAnimationContext *context) {
        context.duration = 0.25;
        context.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut];
        self.logoView.animator.alphaValue = 0;
        self.loadingIndicator.animator.alphaValue = 1;
    } completionHandler:nil];
}

- (void)dismissCoverIfNeeded {
    if (self.didDismissCover || !self.coverOverlay) {
        return;
    }
    self.didDismissCover = YES;

    __weak typeof(self) weakSelf = self;
    [NSAnimationContext runAnimationGroup:^(NSAnimationContext *context) {
        context.duration = kOverlayFadeDuration;
        context.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut];
        weakSelf.coverOverlay.animator.alphaValue = 0;
    } completionHandler:^{
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf) {
            return;
        }
        [strongSelf.loadingIndicator stopAnimation:nil];
        [strongSelf.coverOverlay removeFromSuperview];
        strongSelf.coverOverlay = nil;
        strongSelf.logoView = nil;
        strongSelf.loadingIndicator = nil;
    }];
}

- (BOOL)isNavigationAllowedForURL:(NSURL *)url {
    NSString *scheme = url.scheme.lowercaseString;
    if ([scheme isEqualToString:@"about"] ||
        [scheme isEqualToString:@"data"] ||
        [scheme isEqualToString:@"blob"]) {
        return YES;
    }
    if (![scheme isEqualToString:@"https"] && ![scheme isEqualToString:@"http"]) {
        return NO;
    }
    NSString *host = url.host.lowercaseString;
    if (host.length == 0) {
        return NO;
    }
    return [self.allowedHosts containsObject:host];
}

#pragma mark - WKNavigationDelegate

- (void)webView:(WKWebView *)webView
decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction
decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    NSURL *url = navigationAction.request.URL;
    if (!url || [self isNavigationAllowedForURL:url]) {
        decisionHandler(WKNavigationActionPolicyAllow);
    } else {
        decisionHandler(WKNavigationActionPolicyCancel);
    }
}

- (void)webView:(WKWebView *)webView didCommitNavigation:(WKNavigation *)navigation {
    // 首份 HTML 已提交：启动页切到 Loading，继续挡住未完成页面
    [self showLoadingIfNeeded];
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    // 整页加载完成后再关闭遮罩
    [self dismissCoverIfNeeded];
}

- (void)webView:(WKWebView *)webView
didFailNavigation:(WKNavigation *)navigation
      withError:(NSError *)error {
    [self dismissCoverIfNeeded];
}

- (void)webView:(WKWebView *)webView
didFailProvisionalNavigation:(WKNavigation *)navigation
      withError:(NSError *)error {
    [self dismissCoverIfNeeded];
}

#pragma mark - WKScriptMessageHandler（对齐 jssdk api-names + ready/config）

- (void)userContentController:(WKUserContentController *)userContentController
      didReceiveScriptMessage:(WKScriptMessage *)message {
    if (![message.name isEqualToString:kWebViewHostBridgeName]) {
        return;
    }
    NSString *encoded = nil;
    if ([message.body isKindOfClass:[NSString class]]) {
        encoded = (NSString *)message.body;
    }
    if (encoded.length == 0) {
        return;
    }

    NSString *decoded = [encoded stringByRemovingPercentEncoding] ?: encoded;
    NSData *data = [decoded dataUsingEncoding:NSUTF8StringEncoding];
    if (!data) {
        return;
    }
    NSError *error = nil;
    id json = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    if (error || ![json isKindOfClass:[NSDictionary class]]) {
        NSLog(@"[rainbow] bad envelope: %@", error);
        return;
    }
    NSDictionary *envelope = (NSDictionary *)json;
    NSString *action = [envelope[@"action"] isKindOfClass:[NSString class]] ? envelope[@"action"] : @"";
    NSString *callbackKey = [envelope[@"callbackKey"] isKindOfClass:[NSString class]] ? envelope[@"callbackKey"] : @"";
    if (callbackKey.length == 0) {
        return;
    }
    NSDictionary *result = [self handleJssdkAction:action];
    [self replyJssdkCallbackKey:callbackKey result:result];
}

- (NSDictionary *)handleJssdkAction:(NSString *)action {
    if ([action isEqualToString:@"ready"] ||
        [action isEqualToString:@"ping"] ||
        [action isEqualToString:@"config"]) {
        NSMutableDictionary *data = [NSMutableDictionary dictionary];
        data[@"platform"] = @"macos";
        if ([action isEqualToString:@"ping"]) {
            data[@"ts"] = @((long long)([[NSDate date] timeIntervalSince1970] * 1000.0));
        }
        return @{
            @"msg": [NSString stringWithFormat:@"%@::ok", action],
            @"code": @0,
            @"data": data
        };
    }
    return @{
        @"msg": [NSString stringWithFormat:@"Unknown action: %@", action ?: @""],
        @"code": @40401,
        @"data": @{ @"action": action ?: @"" }
    };
}

- (void)replyJssdkCallbackKey:(NSString *)callbackKey result:(NSDictionary *)result {
    NSError *error = nil;
    NSData *keyData = [NSJSONSerialization dataWithJSONObject:@[ callbackKey ] options:0 error:&error];
    NSData *bodyData = [NSJSONSerialization dataWithJSONObject:result options:0 error:&error];
    if (!keyData || !bodyData) {
        return;
    }
    NSString *keyArr = [[NSString alloc] initWithData:keyData encoding:NSUTF8StringEncoding];
    NSString *body = [[NSString alloc] initWithData:bodyData encoding:NSUTF8StringEncoding];
    if (keyArr.length < 2 || body.length == 0) {
        return;
    }
    NSString *keyLit = [keyArr substringWithRange:NSMakeRange(1, keyArr.length - 2)];
    NSString *script = [NSString stringWithFormat:
                        @"window.webViewHost&&webViewHost.__callback(%@,%@);", keyLit, body];
    [self.webView evaluateJavaScript:script completionHandler:nil];
}

- (void)dealloc {
    [self.webView.configuration.userContentController
        removeScriptMessageHandlerForName:kWebViewHostBridgeName];
}

@end
