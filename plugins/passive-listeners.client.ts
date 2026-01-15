export default defineNuxtPlugin(() => {
  if (process.client) {
    // Make touch event listeners passive by default for better scroll performance
    const addEventListenerOriginal = EventTarget.prototype.addEventListener;
    const removeEventListenerOriginal =
      EventTarget.prototype.removeEventListener;

    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      // Check if this is a touch event that should be passive
      const isTouchEvent = ["touchstart", "touchmove", "wheel"].includes(type);

      if (isTouchEvent) {
        // Convert boolean to object if needed
        let opts: AddEventListenerOptions = {};

        if (typeof options === "boolean") {
          opts.capture = options;
        } else if (options) {
          opts = { ...options };
        }

        // Make it passive if not explicitly set to false
        if (opts.passive === undefined) {
          opts.passive = true;
        }

        return addEventListenerOriginal.call(this, type, listener, opts);
      }

      return addEventListenerOriginal.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) {
      return removeEventListenerOriginal.call(this, type, listener, options);
    };
  }
});
