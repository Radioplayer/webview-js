/* 
    Radioplayer Mobile Native App Bridge.
    Copyright 2012 - Radioplayer: http://www.radioplayer.co.uk
    Built by Tui interactive media: http://www.tui.co.uk

    *** BETA! ***
*/

// DO NOT change the name of this object. It's required and expected in the native apps
var RPBridge = {

    callbacks: new Array(),     // a queue of callbacks maintained to keep track of calls
    callbackId: 0,              // id to make each call unique
    eventHandler: undefined,    // the event handler function defined by the developer in registerEventCallback, below.

    // check the user agent to determine iOs device
    isIOS: function isIOS() {
        var n = navigator.userAgent.toLowerCase();
        return ((n.indexOf("iphone") > -1) || (n.indexOf("ipad") > -1) || (n.indexOf("ipod") > -1));
    },

    // called by the iOs web-view to return a result. Android does not need this
    iOSReturn: function iOSReturn(o) {

        // find the callback to call based on the callback id in the returned object
        for (var i = 0; i < this.callbacks.length; i++) {
            var callbackobj = this.callbacks[i];
            if (callbackobj.cid == o.cid) {

                // we've found the right object.
                if (o.error !== undefined) {

                    // there's been an error. Call the error handler instead.
                    if (typeof callbackobj.error == "function") {
                        callbackobj.error(o.error);
                    } else console.log('RPBridge returned an unhandled error: ' + o.error);

                }
                else {

                    //  Call its "success" callback, passing in our return params
                    if (typeof callbackobj.success == "function") {
                        callbackobj.success(o);
                    } else console.log('sendToDevice callback parameter is not a function');

                }
                // and remove it from the array.
                this.callbacks.splice(i, 1);

                return; // jump out of the loop ASAP
            }
        }
    },



    // Allows the user to register events coming from the app. Note there can only be one event handler function,
    // which must handle all events.
    registerEventCallback: function registerEventCallback(f) {
        if (typeof f == "function") {
            this.eventHandler = f;
        } else console.log("registerEventCallback failed. Argument is not a function.");
    },



    // called by Android/iOS. Handled by the event handler attached by the webview. Fails silently if no 
    // event Handler set.
    receiveFromDevice: function receiveFromDevice(o) {
        if (this.eventHandler !== undefined) {
            if (typeof this.eventHandler == "function") {
                this.eventHandler(o);
            }
        }
    },



    // cross-platform fundamental function for communicating.
    sendToDevice: function sendToDevice(o) {
        // the document must be ready for this to work
        if ((document.readyState == "loading")||(document.readyState == "uninitialized")) {
            if (typeof o.error == "function") {
                // call the error handler
                o.error("sendToDevice called before document is ready");
            } else console.log("sendToDevice called before document is ready");
            return;
        }


        // add a unique callback Id to the arguments object
        o.cid = this.callbackId;

        if (this.isIOS()) {

            // only use the callbacks queue in iOS
            this.callbacks.push(o);

            // Thanks to Alexandre Poirot for this code https://github.com/ochameau/NativeBridge
            var iframe = document.createElement("IFRAME");
            iframe.setAttribute("src", "rp-api:" + escape(JSON.stringify(o)));
            document.documentElement.appendChild(iframe);
            iframe.parentNode.removeChild(iframe);
            iframe = null;

            this.callbackId++;

            // Note: iOS calls "iOSReturn", above, when it's finished.

        } else {

            // ANDROID ////////////////////////////////////////////////////

            var ret = JSON.parse(Android.callAPI(JSON.stringify(o)));

            if (ret.error !== undefined) {

                // there's been an error. Did we get an error handler?
                if (typeof o.error == "function") {
                    // call the error handler
                    o.error(ret.error);
                } else console.log('RPBridge returned an unhandled error: ' + ret.error);

                // don't do success as well as error!
                return;
            }

            if (o.success !== undefined) {
                if (typeof o.success == "function") {
                    o.success(ret);
                } else console.log('RPBridge sendToDevice callback parameter is not a function');
            }
        }
    }

} // end object declaration
