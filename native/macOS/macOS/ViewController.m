#import "ViewController.h"
#import <QuartzCore/QuartzCore.h>
#import <WebKit/WebKit.h>

static NSString * const kHomeURLString = @"https://dv.phb.plus/";
static NSTimeInterval const kOverlayFadeDuration = 0.35;
static CGFloat const kSplashLogoSide = 160.0;
static CGFloat const kWindowScreenRatio = 0.70;

@interface ViewController () <WKNavigationDelegate>
@property (nonatomic, strong) WKWebView *webView;
@property (nonatomic, strong) NSView *coverOverlay;
@property (nonatomic, strong) NSImageView *logoView;
@property (nonatomic, strong) NSProgressIndicator *loadingIndicator;
@property (nonatomic, assign) BOOL didShowLoading;
@property (nonatomic, assign) BOOL didDismissCover;
@property (nonatomic, assign) BOOL didConfigureWindow;
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

- (void)setupWebView {
    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    if (@available(macOS 10.12, *)) {
        config.mediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypeNone;
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

    NSURL *url = [NSURL URLWithString:kHomeURLString];
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

#pragma mark - WKNavigationDelegate

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

@end
