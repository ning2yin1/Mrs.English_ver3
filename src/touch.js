// Explicit pan axes keep one-finger scroll/swipe while excluding browser zoom gestures.
for(const type of ['gesturestart','gesturechange','gestureend'])document.addEventListener(type,event=>{if(event.cancelable)event.preventDefault();},{passive:false,capture:true});
let pinching=false;
for(const type of ['touchstart','touchmove'])document.addEventListener(type,event=>{if(event.touches.length>1){pinching=true;if(event.cancelable)event.preventDefault();}},{passive:false,capture:true});
document.addEventListener('touchend',event=>{if(pinching){if(event.cancelable)event.preventDefault();if(!event.touches.length)pinching=false;}},{passive:false,capture:true});
document.addEventListener('touchcancel',()=>{pinching=false;},{passive:true,capture:true});
// Do not cancel ordinary touchend/dblclick: consecutive game taps must both reach buttons.
