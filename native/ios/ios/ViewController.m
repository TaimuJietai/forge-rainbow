#import "ViewController.h"
#import <WebKit/WebKit.h>

static NSString * const kHomeURLString = @"https://dv.phb.plus/";
static NSTimeInterval const kOverlayFadeDuration = 0.35;
static CGFloat const kSplashLogoSide = 160.0;

@interface ViewController () <WKNavigationDelegate>
@property (nonatomic, strong) WKWebView *webView;
@property (nonatomic, strong) UIView *coverOverlay;
@property (nonatomic, strong) UIImageView *logoView;
@property (nonatomic, strong) UIActivityIndicatorView *loadingIndicator;
@property (nonatomic, assign) BOOL didShowLoading;
@property (nonatomic, assign) BOOL didDismissCover;
@end

@implementation ViewController

- (void)viewDidLoad {
    [super viewDidLoad];

    self.edgesForExtendedLayout = UIRectEdgeAll;
    self.extendedLayoutIncludesOpaqueBars = YES;

    UIColor *background = [UIColor colorNamed:@"LaunchBackground"];
    if (!background) {
        background = [UIColor colorWithRed:212.0 / 255.0
                                     green:222.0 / 255.0
                                      blue:230.0 / 255.0
                                     alpha:1.0];
    }
    self.view.backgroundColor = background;

    [self setupWebView];
    [self setupCoverOverlayWithBackground:background];
}

- (BOOL)prefersStatusBarHidden {
    return YES;
}

- (UIStatusBarAnimation)preferredStatusBarUpdateAnimation {
    return UIStatusBarAnimationFade;
}

- (void)setupWebView {
    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    config.allowsInlineMediaPlayback = YES;
    if (@available(iOS 10.0, *)) {
        config.mediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypeNone;
    }

    self.webView = [[WKWebView alloc] initWithFrame:CGRectZero configuration:config];
    self.webView.navigationDelegate = self;
    self.webView.opaque = NO;
    self.webView.backgroundColor = UIColor.clearColor;
    self.webView.scrollView.backgroundColor = UIColor.clearColor;
    self.webView.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    self.webView.scrollView.contentInset = UIEdgeInsetsZero;
    self.webView.scrollView.scrollIndicatorInsets = UIEdgeInsetsZero;
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

- (void)setupCoverOverlayWithBackground:(UIColor *)background {
    self.coverOverlay = [[UIView alloc] initWithFrame:CGRectZero];
    self.coverOverlay.backgroundColor = background;
    self.coverOverlay.translatesAutoresizingMaskIntoConstraints = NO;
    [self.view addSubview:self.coverOverlay];

    self.logoView = [[UIImageView alloc] initWithImage:[UIImage imageNamed:@"LaunchLogo"]];
    self.logoView.contentMode = UIViewContentModeScaleAspectFit;
    self.logoView.translatesAutoresizingMaskIntoConstraints = NO;
    [self.coverOverlay addSubview:self.logoView];

    if (@available(iOS 13.0, *)) {
        self.loadingIndicator = [[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleMedium];
    } else {
        self.loadingIndicator = [[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleGray];
    }
    self.loadingIndicator.hidesWhenStopped = YES;
    self.loadingIndicator.translatesAutoresizingMaskIntoConstraints = NO;
    self.loadingIndicator.alpha = 0;
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

- (void)viewDidLayoutSubviews {
    [super viewDidLayoutSubviews];
    self.webView.scrollView.contentInset = UIEdgeInsetsZero;
    self.webView.scrollView.scrollIndicatorInsets = UIEdgeInsetsZero;
}

- (void)showLoadingIfNeeded {
    if (self.didShowLoading || self.didDismissCover || !self.coverOverlay) {
        return;
    }
    self.didShowLoading = YES;

    [self.loadingIndicator startAnimating];
    [UIView animateWithDuration:0.25
                          delay:0
                        options:UIViewAnimationOptionCurveEaseInOut
                     animations:^{
                         self.logoView.alpha = 0;
                         self.loadingIndicator.alpha = 1;
                     }
                     completion:nil];
}

- (void)dismissCoverIfNeeded {
    if (self.didDismissCover || !self.coverOverlay) {
        return;
    }
    self.didDismissCover = YES;

    [UIView animateWithDuration:kOverlayFadeDuration
                          delay:0
                        options:UIViewAnimationOptionCurveEaseInOut
                     animations:^{
                         self.coverOverlay.alpha = 0;
                     }
                     completion:^(__unused BOOL finished) {
                         [self.loadingIndicator stopAnimating];
                         [self.coverOverlay removeFromSuperview];
                         self.coverOverlay = nil;
                         self.logoView = nil;
                         self.loadingIndicator = nil;
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

@end
