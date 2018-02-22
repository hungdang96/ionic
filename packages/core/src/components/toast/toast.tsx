import { Component, Element, Event, EventEmitter, Listen, Method, Prop } from '@stencil/core';
import { Animation, AnimationBuilder, AnimationController, Config, CssClassMap, DomController, OverlayDismissEvent, OverlayDismissEventDetail } from '../../index';

import { domControllerAsync, playAnimationAsync } from '../../utils/helpers';
import { createThemedClasses, getClassMap } from '../../utils/theme';
import { OverlayInterface } from '../../utils/overlays';

import iosEnterAnimation from './animations/ios.enter';
import iosLeaveAnimation from './animations/ios.leave';

import mdEnterAnimation from './animations/md.enter';
import mdLeaveAnimation from './animations/md.leave';

@Component({
  tag: 'ion-toast',
  styleUrls: {
    ios: 'toast.ios.scss',
    md: 'toast.md.scss'
  },
  host: {
    theme: 'toast'
  }
})
export class Toast implements OverlayInterface {

  private animation: Animation | null;

  @Element() private el: HTMLElement;

  mode: string;
  color: string;

  @Prop({ connect: 'ion-animation-controller' }) animationCtrl: AnimationController;
  @Prop({ context: 'config' }) config: Config;
  @Prop({ context: 'dom' }) dom: DomController;
  @Prop() overlayId: number;

  /**
   * Animation to use when the toast is presented.
   */
  @Prop() enterAnimation: AnimationBuilder;

  /**
   * Animation to use when the toast is dismissed.
   */
  @Prop() leaveAnimation: AnimationBuilder;

  /**
   * Text to display in the close button.
   */
  @Prop() closeButtonText: string;

  /**
   * Additional classes to apply for custom CSS. If multiple classes are
   * provided they should be separated by spaces.
   */
  @Prop() cssClass: string;

  /**
   * If true, the toast will dismiss when the page changes. Defaults to `false`.
   */
  @Prop() dismissOnPageChange: boolean;

  /**
   * How many milliseconds to wait before hiding the toast. By default, it will show
   * until `dismiss()` is called.
   */
  @Prop() duration: number;

  /**
   * Message to be shown in the toast.
   */
  @Prop() message: string;

  /**
   * The position of the toast on the screen. Possible values: "top", "middle", "bottom".
   */
  @Prop() position: string;

  /**
   * If true, the close button will be displayed. Defaults to `false`.
   */
  @Prop() showCloseButton = false;

  /**
   * If true, the toast will be translucent. Defaults to `false`.
   */
  @Prop() translucent = false;

  /**
   * If true, the toast will animate. Defaults to `true`.
   */
  @Prop() willAnimate = true;

  /**
   * Emitted after the toast has loaded.
   */
  @Event() ionToastDidLoad: EventEmitter<ToastEventDetail>;

  /**
   * Emitted after the toast has presented.
   */
  @Event() ionToastDidPresent: EventEmitter<ToastEventDetail>;

  /**
   * Emitted before the toast has presented.
   */
  @Event() ionToastWillPresent: EventEmitter<ToastEventDetail>;

  /**
   * Emitted before the toast has dismissed.
   */
  @Event() ionToastWillDismiss: EventEmitter<ToastDismissEventDetail>;

  /**
   * Emitted after the toast has dismissed.
   */
  @Event() ionToastDidDismiss: EventEmitter<ToastDismissEventDetail>;

  /**
   * Emitted after the toast has unloaded.
   */
  @Event() ionToastDidUnload: EventEmitter<ToastEventDetail>;

  /**
   * Present the toast overlay after it has been created.
   */
  @Method()
  present() {
    if (this.animation) {
      this.animation.destroy();
      this.animation = null;
    }
    this.ionToastWillPresent.emit();

    // get the user's animation fn if one was provided
    const animationBuilder = this.enterAnimation || this.config.get('toastEnter', this.mode === 'ios' ? iosEnterAnimation : mdEnterAnimation);

    // build the animation and kick it off
    return this.animationCtrl.create(animationBuilder, this.el, this.position).then(animation => {
      this.animation = animation;
      if (!this.willAnimate) {
        // if the duration is 0, it won't actually animate I don't think
        // TODO - validate this
        this.animation = animation.duration(0);
      }
      return playAnimationAsync(animation);
    }).then((animation) => {
      animation.destroy();
      this.componentDidEnter();
    });
  }

  /**
   * Dismiss the toast overlay after it has been presented.
   */
  @Method()
  dismiss(data?: any, role?: string) {
    if (this.animation) {
      this.animation.destroy();
      this.animation = null;
    }

    this.ionToastWillDismiss.emit({
      data,
      role
    });

    const animationBuilder = this.leaveAnimation || this.config.get('toastLeave', this.mode === 'ios' ? iosLeaveAnimation : mdLeaveAnimation);

    return this.animationCtrl.create(animationBuilder, this.el, this.position).then(animation => {
      this.animation = animation;
      return playAnimationAsync(animation);
    }).then((animation) => {
      animation.destroy();
      this.ionToastDidDismiss.emit({
        data,
        role
      });
    }).then(() => {
      return domControllerAsync(this.dom.write, () => {
        this.el.parentNode.removeChild(this.el);
      });
    });
  }

  componentDidLoad() {
    this.ionToastDidLoad.emit();
  }

  componentDidEnter() {
    this.ionToastDidPresent.emit();
    if (this.duration) {
      setTimeout(() => {
        this.dismiss();
      }, this.duration);
    }
  }

  componentDidUnload() {
    this.ionToastDidUnload.emit();
  }

  @Listen('ionDismiss')
  protected onDismiss(ev: UIEvent) {
    ev.stopPropagation();
    ev.preventDefault();

    this.dismiss();
  }

  private wrapperClass(): CssClassMap {
    const position = this.position ? this.position : 'bottom';
    return {
      'toast-wrapper': true,
      [`toast-${position}`]: true
    };
  }

  hostData() {
    const themedClasses = this.translucent ? createThemedClasses(this.mode, this.color, 'toast-translucent') : {};

    return {
      class: {
        ...themedClasses,
        ...getClassMap(this.cssClass)
      }
    };
  }

  render() {
    return (
      <div class={this.wrapperClass()}>
        <div class='toast-container'>
          {this.message
            ? <div class='toast-message'>{this.message}</div>
            : null}
          {this.showCloseButton
            ? <ion-button fill='clear' color='light' class='toast-button' onClick={() => this.dismiss()}>
                {this.closeButtonText || 'Close'}
              </ion-button>
            : null}
        </div>
      </div>
    );
  }

}

export interface ToastOptions {
  message?: string;
  cssClass?: string;
  duration?: number;
  showCloseButton?: boolean;
  closeButtonText?: string;
  dismissOnPageChange?: boolean;
  position?: string;
  translucent?: boolean;
  enterAnimation?: AnimationBuilder;
  exitAnimation?: AnimationBuilder;
}

export interface ToastEvent extends CustomEvent {
  target: HTMLIonToastElement;
  detail: ToastEventDetail;
}

export interface ToastEventDetail {

}

export interface ToastDismissEventDetail extends OverlayDismissEventDetail {
  // keep this just for the sake of static types and potential future extensions
}

export interface ToastDismissEvent extends OverlayDismissEvent {
  // keep this just for the sake of static types and potential future extensions
}

export {
  iosEnterAnimation as iosToastEnterAnimation,
  iosLeaveAnimation as iosToastLeaveAnimation,
  mdEnterAnimation as mdToastEnterAnimation,
  mdLeaveAnimation as mdToastLeaveAnimation
};
