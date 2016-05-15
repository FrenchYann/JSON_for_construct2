// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");

(function()
{
	// Use requestAnimationFrame when available
	var raf = window["requestAnimationFrame"] ||
	  window["mozRequestAnimationFrame"]    ||
	  window["webkitRequestAnimationFrame"] ||
	  window["msRequestAnimationFrame"]     ||
	  window["oRequestAnimationFrame"];
	
	// Runtime class
	function Runtime(canvas)
	{
		// No canvas support: fail silently
		if (!canvas || (!canvas.getContext && !canvas["dc"]))
			return;
		
		// Prevent double-creation of the runtime
		if (canvas["c2runtime"])
			return;
		else
			canvas["c2runtime"] = this;
			
		var self = this;
		
		// Detect wrapper platforms
		this.isCrosswalk = /crosswalk/i.test(navigator.userAgent) || /xwalk/i.test(navigator.userAgent) || !!(typeof window["c2isCrosswalk"] !== "undefined" && window["c2isCrosswalk"]);
		
		// note Crosswalk is cordova-capable
		this.isCordova = this.isCrosswalk || (typeof window["device"] !== "undefined" && (typeof window["device"]["cordova"] !== "undefined" || typeof window["device"]["phonegap"] !== "undefined")) || (typeof window["c2iscordova"] !== "undefined" && window["c2iscordova"]);
		
		// for backwards compatibility with any plugins checking for the old isPhoneGap variable
		this.isPhoneGap = this.isCordova;
		
		this.isDirectCanvas = !!canvas["dc"];
		this.isAppMobi = (typeof window["AppMobi"] !== "undefined" || this.isDirectCanvas);
		this.isCocoonJs = !!window["c2cocoonjs"];
		this.isEjecta = !!window["c2ejecta"];
		
		// Attach CocoonJS suspend/resume events
		if (this.isCocoonJs)
		{
			CocoonJS["App"]["onSuspended"].addEventListener(function() {
				self["setSuspended"](true);
			});
			CocoonJS["App"]["onActivated"].addEventListener(function () {
				self["setSuspended"](false);
			});
		}
		
		// Attach Ejecta suspend/resume events
		if (this.isEjecta)
		{
			document.addEventListener("pagehide", function() {
				self["setSuspended"](true);
			});
			document.addEventListener("pageshow", function() {
				self["setSuspended"](false);
			});
			document.addEventListener("resize", function () {
				self["setSize"](window.innerWidth, window.innerHeight);
			});
		}
		
		// 'DOM free' mode is when in non-browser engines like directCanvas and CocoonJS.
		// Not all browser features are available, or they must be handled differently (through platform-specifics).
		this.isDomFree = (this.isDirectCanvas || this.isCocoonJs || this.isEjecta);
		
		// Detect the platform that we're running on by looking at the user agent string.
		// Note IE uses MSIE (<IE11), Trident (IE11), or IEMobile (Windows Phone).
		this.isMicrosoftEdge = /edge\//i.test(navigator.userAgent);
		this.isIE = (/msie/i.test(navigator.userAgent) || /trident/i.test(navigator.userAgent) || /iemobile/i.test(navigator.userAgent)) && !this.isMicrosoftEdge;
		this.isTizen = /tizen/i.test(navigator.userAgent);
		this.isAndroid = /android/i.test(navigator.userAgent) && !this.isTizen && !this.isIE && !this.isMicrosoftEdge;		// IE mobile and Tizen masquerade as Android
		this.isiPhone = (/iphone/i.test(navigator.userAgent) || /ipod/i.test(navigator.userAgent)) && !this.isIE && !this.isMicrosoftEdge;	// treat ipod as an iphone; IE mobile masquerades as iPhone
		this.isiPad = /ipad/i.test(navigator.userAgent);
		this.isiOS = this.isiPhone || this.isiPad || this.isEjecta;
		this.isiPhoneiOS6 = (this.isiPhone && /os\s6/i.test(navigator.userAgent));
		this.isChrome = (/chrome/i.test(navigator.userAgent) || /chromium/i.test(navigator.userAgent)) && !this.isIE && !this.isMicrosoftEdge;	// note true on Chromium-based webview on Android 4.4+; IE 'Edge' mode also pretends to be Chrome
		this.isAmazonWebApp = /amazonwebappplatform/i.test(navigator.userAgent);
		this.isFirefox = /firefox/i.test(navigator.userAgent);
		this.isSafari = /safari/i.test(navigator.userAgent) && !this.isChrome && !this.isIE && !this.isMicrosoftEdge;		// Chrome and IE Mobile masquerade as Safari
		this.isWindows = /windows/i.test(navigator.userAgent);
		this.isNWjs = (typeof window["c2nodewebkit"] !== "undefined" || typeof window["c2nwjs"] !== "undefined" || /nodewebkit/i.test(navigator.userAgent) || /nwjs/i.test(navigator.userAgent));
		this.isNodeWebkit = this.isNWjs;		// old name for backwards compat
		this.isArcade = (typeof window["is_scirra_arcade"] !== "undefined");
		this.isWindows8App = !!(typeof window["c2isWindows8"] !== "undefined" && window["c2isWindows8"]);
		this.isWindows8Capable = !!(typeof window["c2isWindows8Capable"] !== "undefined" && window["c2isWindows8Capable"]);
		this.isWindowsPhone8 = !!(typeof window["c2isWindowsPhone8"] !== "undefined" && window["c2isWindowsPhone8"]);
		this.isWindowsPhone81 = !!(typeof window["c2isWindowsPhone81"] !== "undefined" && window["c2isWindowsPhone81"]);
		this.isWindows10 = !!window["cr_windows10"];
		this.isWinJS = (this.isWindows8App || this.isWindows8Capable || this.isWindowsPhone81 || this.isWindows10);	// note not WP8.0
		this.isBlackberry10 = !!(typeof window["c2isBlackberry10"] !== "undefined" && window["c2isBlackberry10"]);
		this.isAndroidStockBrowser = (this.isAndroid && !this.isChrome && !this.isCrosswalk && !this.isFirefox && !this.isAmazonWebApp && !this.isDomFree);
		this.devicePixelRatio = 1;
		
		// Determine if running on a mobile: always true in mobile wrapper
		this.isMobile = (this.isCordova || this.isCrosswalk || this.isAppMobi || this.isCocoonJs || this.isAndroid || this.isiOS || this.isWindowsPhone8 || this.isWindowsPhone81 || this.isBlackberry10 || this.isTizen || this.isEjecta);
		
		// If not in Cordova or AppMobi mode, check for some other common mobile manufacturers
		if (!this.isMobile)
		{
			this.isMobile = /(blackberry|bb10|playbook|palm|symbian|nokia|windows\s+ce|phone|mobile|tablet|kindle|silk)/i.test(navigator.userAgent);
		}
		
		// Identify WKWebView. This is Cordova on iOS (implying a webview), and WKWebView supports indexedDB where UIWebView does not.
		this.isWKWebView = !!(this.isiOS && this.isCordova && window.indexedDB);
		
		// Preview server for video in WKWebView.
		this.httpServer = null;
		this.httpServerUrl = "";
		
		if (this.isWKWebView)
		{
			this.httpServer = (cordova && cordova["plugins"] && cordova["plugins"]["CorHttpd"]) ? cordova["plugins"]["CorHttpd"] : null;
		}
		
		// NW.js detects as Chrome in preview mode. To work around this, allow a ?nw query string
		// to force it to detect as NW.js, or check for "nodewebkit" or "nwjs" in the user agent.
		if (typeof cr_is_preview !== "undefined" && !this.isNWjs && (window.location.search === "?nw" || /nodewebkit/i.test(navigator.userAgent) || /nwjs/i.test(navigator.userAgent)))
		{
			this.isNWjs = true;
		}
		
		this.isDebug = (typeof cr_is_preview !== "undefined" && window.location.search.indexOf("debug") > -1);

		// Renderer variables
		this.canvas = canvas;
		this.canvasdiv = document.getElementById("c2canvasdiv");
		this.gl = null;
		this.glwrap = null;
		this.glUnmaskedRenderer = "(unavailable)";
		this.enableFrontToBack = false;
		this.earlyz_index = 0;
		this.ctx = null;
		this.fullscreenOldMarginCss = "";
		this.firstInFullscreen = false;
		this.oldWidth = 0;		// for restoring non-fullscreen canvas after fullscreen
		this.oldHeight = 0;
		
		// Prevent selections and context menu on the canvas
		this.canvas.oncontextmenu = function (e) { if (e.preventDefault) e.preventDefault(); return false; };
		this.canvas.onselectstart = function (e) { if (e.preventDefault) e.preventDefault(); return false; };

		if (this.isDirectCanvas)
			window["c2runtime"] = this;
			
		// In NW.js, prevent a drag-drop navigating the browser window.
		// Note if present the NW.js plugin will override ondrop.
		if (this.isNWjs)
		{
			window["ondragover"] = function(e) { e.preventDefault(); return false; };
			window["ondrop"] = function(e) { e.preventDefault(); return false; };
			
			// Also clear the cache since it will keep leaking files in the Cache folder otherwise.
			// (Note in debug mode window["nwgui"] is not available)
			if (window["nwgui"] && window["nwgui"]["App"]["clearCache"])
				window["nwgui"]["App"]["clearCache"]();
		}
		
		// Horrible hack to work around overflow bug on old Android stock browsers.
		if (this.isAndroidStockBrowser && typeof jQuery !== "undefined")
		{
			jQuery("canvas").parents("*").css("overflow", "visible");
		}

		this.width = canvas.width;
		this.height = canvas.height;
		this.draw_width = this.width;
		this.draw_height = this.height;
		this.cssWidth = this.width;
		this.cssHeight = this.height;
		this.lastWindowWidth = window.innerWidth;
		this.lastWindowHeight = window.innerHeight;
		this.forceCanvasAlpha = false;		// allow plugins to force the canvas to display with alpha channel

		this.redraw = true;
		this.isSuspended = false;
		
		// Ensure now method present
		if (!Date.now) {
		  Date.now = function now() {
			return +new Date();
		  };
		}
		
		// Model
		this.plugins = [];
		this.types = {};
		this.types_by_index = [];
		this.behaviors = [];
		this.layouts = {};
		this.layouts_by_index = [];
		this.eventsheets = {};
		this.eventsheets_by_index = [];
		this.wait_for_textures = [];        // for blocking until textures loaded
		this.triggers_to_postinit = [];
		this.all_global_vars = [];
		this.all_local_vars = [];
		
		this.solidBehavior = null;
		this.jumpthruBehavior = null;
		this.shadowcasterBehavior = null;

		// Death row (for objects pending full destroy) - mapped by type to cr.ObjectSet
		this.deathRow = {};
		this.hasPendingInstances = false;		// true if anything exists in create row or death row
		this.isInClearDeathRow = false;
		this.isInOnDestroy = 0;					// needs to support recursion so increments and decrements and is true if > 0
		this.isRunningEvents = false;
		this.isEndingLayout = false;
		
		// Creation row (for objects pending a full create)
		this.createRow = [];

		// save/load state variables (only handled at end of tick)
		this.isLoadingState = false;
		this.saveToSlot = "";
		this.loadFromSlot = "";
		this.loadFromJson = "";
		this.lastSaveJson = "";
		this.signalledContinuousPreview = false;
		this.suspendDrawing = false;		// for hiding display until continuous preview loads
		this.fireOnCreateAfterLoad = [];	// for delaying "On create" triggers until loading complete
		
        // dt1 = delta time by wall clock; dt = delta time after timescaling
		this.dt = 0;                
        this.dt1 = 0;
		this.minimumFramerate = 30;
		this.logictime = 0;			// used to calculate CPUUtilisation
		this.cpuutilisation = 0;
		/**PREVIEWONLY**/this.rendertime = 0;
		/**PREVIEWONLY**/this.rendercpu = 0;
		/**PREVIEWONLY**/this.eventstime = 0;
		/**PREVIEWONLY**/this.eventscpu = 0;
        this.timescale = 1.0;
        this.kahanTime = new cr.KahanAdder();
		this.wallTime = new cr.KahanAdder();
		this.last_tick_time = 0;
		this.fps = 0;
		this.last_fps_time = 0;
		this.tickcount = 0;
		this.execcount = 0;
		this.framecount = 0;        // for fps
		this.objectcount = 0;
		/**PREVIEWONLY**/this.collisioncheck_count = 0;
		/**PREVIEWONLY**/this.collisioncheck_sec = 0;
		/**PREVIEWONLY**/this.polycheck_count = 0;
		/**PREVIEWONLY**/this.polycheck_sec = 0;
		/**PREVIEWONLY**/this.movedcell_count = 0;
		/**PREVIEWONLY**/this.movedcell_sec = 0;
		/**PREVIEWONLY**/this.movedrendercell_count = 0;
		/**PREVIEWONLY**/this.movedrendercell_sec = 0;
		/**PREVIEWONLY**/this.physics_cpu = 0;
		/**PREVIEWONLY**/this.hit_breakpoint = false;			// suspended on debugger breakpoint
		/**PREVIEWONLY**/this.step_break = false;				// break on next item (for debug step)
		/**PREVIEWONLY**/this.resuming_breakpoint = false;		// resuming from a debugger breakpoint
		/**PREVIEWONLY**/this.breakpoint_event = null;			// current event of breakpoint hit
		/**PREVIEWONLY**/this.breakpoint_action = null;
		/**PREVIEWONLY**/this.breakpoint_condition = null;
		this.changelayout = null;
		this.destroycallbacks = [];
		this.event_stack = [];
		this.event_stack_index = -1;
		this.localvar_stack = [[]];
		this.localvar_stack_index = 0;
		this.trigger_depth = 0;		// recursion depth for triggers
		this.pushEventStack(null);
		this.loop_stack = [];
		this.loop_stack_index = -1;
		this.next_uid = 0;
		this.next_puid = 0;		// permanent unique ids
		this.layout_first_tick = true;
		this.family_count = 0;
		this.suspend_events = [];
		this.raf_id = -1;
		this.timeout_id = -1;
		this.isloading = true;
		this.loadingprogress = 0;
		this.isNodeFullscreen = false;
		this.stackLocalCount = 0;	// number of stack-based local vars for recursion
		
		// For audio preloading
		this.audioInstance = null;
		
		// Games in iframes never get keyboard focus unless we allow at least
		// one click without calling preventDefault().
		this.had_a_click = false;
		this.isInUserInputEvent = false;

        // Instances requesting that they be ticked
		this.objects_to_pretick = new cr.ObjectSet();
        this.objects_to_tick = new cr.ObjectSet();
		this.objects_to_tick2 = new cr.ObjectSet();
		
		this.registered_collisions = [];
		this.temp_poly = new cr.CollisionPoly([]);
		this.temp_poly2 = new cr.CollisionPoly([]);

		this.allGroups = [];				// array of all event groups
        this.groups_by_name = {};
		this.cndsBySid = {};
		this.actsBySid = {};
		this.varsBySid = {};
		this.blocksBySid = {};
		
		this.running_layout = null;			// currently running layout
		this.layer_canvas = null;			// for layers "render-to-texture"
		this.layer_ctx = null;
		this.layer_tex = null;
		this.layout_tex = null;
		this.layout_canvas = null;
		this.layout_ctx = null;
		this.is_WebGL_context_lost = false;
		this.uses_background_blending = false;	// if any shader uses background blending, so entire layout renders to texture
		this.fx_tex = [null, null];
		this.fullscreen_scaling = 0;
		this.files_subfolder = "";			// path with project files
		this.objectsByUid = {};				// maps every in-use UID (as a string) to its instance
		
		this.loaderlogos = null;
		
		this.snapshotCanvas = null;
		this.snapshotData = "";
		
		this.objectRefTable = [];
		
		// kick off AJAX request for data.js
		this.requestProjectData();
	};
	
	Runtime.prototype.requestProjectData = function ()
	{
		var self = this;
		
		// WKWebView in Cordova breaks AJAX to local files. However the Cordova file API works, so use that as a workaround.
		if (this.isWKWebView)
		{
			// Start the preview server.
			if (this.httpServer)
			{
				this.httpServer["startServer"]({
					"port": 0,
					"localhost_only": true
				}, function (url)
				{
					self.httpServerUrl = url;
					
					// Fetch data.js (using cordova, no need for http server for this)
					self.fetchLocalFileViaCordovaAsText("data.js", function (str)
					{
						self.loadProject(JSON.parse(str));
						
					}, function (err)
					{
						alert("Error fetching data.js");
					});
					
				}, function (err)
				{
					alert("error starting local server: " + err);
				});
			}
			else
			{
				// The HTTP server plugin is unavailable. Perhaps the build settings are incorrect or this platform does not support it.
				// To try and keep things working simply proceed with loading without there being a HTTP server available. The only
				// thing that will break is video support.
				this.fetchLocalFileViaCordovaAsText("data.js", function (str)
				{
					self.loadProject(JSON.parse(str));
					
				}, function (err)
				{
					alert("Error fetching data.js");
				});
			}
			
			return;
		}
		
		var xhr;
		
		// Windows Phone 8 can't AJAX local files using the standards-based API, but
		// can if we use the old-school ActiveXObject. So use ActiveX on WP8 only.
		if (this.isWindowsPhone8)
			xhr = new ActiveXObject("Microsoft.XMLHTTP");
		else
			xhr = new XMLHttpRequest();
		
		var datajs_filename = "data.js";
		
		// Work around stupid WACK limitation
		if (this.isWindows8App || this.isWindowsPhone8 || this.isWindowsPhone81 || this.isWindows10)
			datajs_filename = "data.json";
		
		xhr.open("GET", datajs_filename, true);
		
		// Check if responseType "json" is supported, and use it if so
		var supportsJsonResponse = false;
		
		// don't trust non-browser engines to implement json type correctly
		if (!this.isDomFree && ("response" in xhr) && ("responseType" in xhr))
		{
			try {
				xhr["responseType"] = "json";
				supportsJsonResponse = (xhr["responseType"] === "json");
			}
			catch (e) {
				supportsJsonResponse = false;
			}
		}
		
		// If JSON not supported, try to force text mode instead
		if (!supportsJsonResponse && ("responseType" in xhr))
		{
			try {
				xhr["responseType"] = "text";
			}
			catch (e) {}
		}
		
		// Who knows what the server MIME type/charset configuration is, so try to force the browser to
		// correctly interpret the response as UTF-8 JSON data
		if ("overrideMimeType" in xhr)
		{
			try {
				xhr["overrideMimeType"]("application/json; charset=utf-8");
			}
			catch (e) {}
		}
		
		if (this.isWindowsPhone8)
		{
			// WP8 ActiveX doesn't support normal onload/onerror - use onreadystatechange instead.
			// Note WP8 doesn't support json response so skip that.
			xhr.onreadystatechange = function ()
			{
				if (xhr.readyState !== 4)
					return;

				self.loadProject(JSON.parse(xhr["responseText"]));
			};
		}
		else
		{
			xhr.onload = function ()
			{
				if (supportsJsonResponse)
				{
					self.loadProject(xhr["response"]);					// already parsed by browser
				}
				else
				{
					if (self.isEjecta)
					{
						// Ejecta doesn't recognise UTF-8 BOMs and will throw a JSON parse error if it sees one.
						// To work around this, search for the opening { to skip a BOM if any.
						var str = xhr["responseText"];
						str = str.substr(str.indexOf("{"));		// trim any BOM
						self.loadProject(JSON.parse(str));
					}
					else
					{
						self.loadProject(JSON.parse(xhr["responseText"]));	// forced to sync parse JSON
					}
				}
			};
			
			xhr.onerror = function (e)
			{
				cr.logerror("Error requesting " + datajs_filename + ":");
				cr.logerror(e);
			};
		}
		
		xhr.send();
	};
	
	// JSON data is loaded; init renderer and kick off asset loader
	Runtime.prototype.initRendererAndLoader = function ()
	{
		var self = this;
		var i, len, j, lenj, k, lenk, t, s, l, y;
		
		// Enable hi-dpi support (called Retina mode for legacy reasons). Note Android stock browser
		// reports devicePixelRatio incorrectly so disable on there.
		this.isRetina = ((!this.isDomFree || this.isEjecta || this.isCordova) && this.useHighDpi && !this.isAndroidStockBrowser);
		
		// iOS 8 bug: Safari apparently tries to auto-scale WebGL canvases, and does it wrong, so we can't size high-DPI non-fullscreen
		// canvases properly. To work around this, in non-fullscreen mode on iOS, disable retina mode (high-DPI display).
		if (this.fullscreen_mode === 0 && this.isiOS)
			this.isRetina = false;
		
		this.devicePixelRatio = (this.isRetina ? (window["devicePixelRatio"] || window["webkitDevicePixelRatio"] || window["mozDevicePixelRatio"] || window["msDevicePixelRatio"] || 1) : 1);
		
		// In case any singleglobal plugins destroy themselves on startup
		this.ClearDeathRow();
		
		var attribs;
		var alpha_canvas = !!(this.forceCanvasAlpha || (this.alphaBackground && !(this.isNWjs || this.isWinJS || this.isWindowsPhone8 || this.isCrosswalk || this.isCordova || this.isAmazonWebApp)));
		
		// Call setSize before getting context to avoid wastefully creating a canvas at the wrong size which
		// will immediately be resized
		if (this.fullscreen_mode > 0)
			this["setSize"](window.innerWidth, window.innerHeight, true);
		
		// Create renderer - check for WebGL support
		try {
			if (this.enableWebGL && (this.isCocoonJs || this.isEjecta || !this.isDomFree))
			{
				// No need for depth buffer or antialiasing. Use failIfMajorPerformanceCaveat to indicate
				// in Chrome that we would rather not get a software-rendered WebGL - it's better for us
				// to fall back to canvas2d in that case.
				attribs = {
					"alpha": alpha_canvas,
					"depth": false,
					"antialias": false,
					"failIfMajorPerformanceCaveat": true
				};
				
				this.gl = (this.canvas.getContext("webgl", attribs) || this.canvas.getContext("experimental-webgl", attribs));
			}
		}
		catch (e) {
		}
		
		// Using WebGL (was enabled and browser supports it)
		if (this.gl)
		{
			// Try to identify unmasked renderer info
			var debug_ext = this.gl.getExtension("WEBGL_debug_renderer_info");
			
			if (debug_ext)
			{
				var unmasked_vendor = this.gl.getParameter(debug_ext.UNMASKED_VENDOR_WEBGL);
				var unmasked_renderer = this.gl.getParameter(debug_ext.UNMASKED_RENDERER_WEBGL);
				this.glUnmaskedRenderer = unmasked_renderer + " [" + unmasked_vendor + "]";
			}
			
			if (this.enableFrontToBack)
				this.glUnmaskedRenderer += " [front-to-back enabled]";
			
			log("Using WebGL renderer: " + this.glUnmaskedRenderer);
			
			// Skip overlay canvas/loading screen on domfree platforms (e.g. CocoonJS WebGL)
			if (!this.isDomFree)
			{
				this.overlay_canvas = document.createElement("canvas");
				jQuery(this.overlay_canvas).appendTo(this.canvas.parentNode);
				this.overlay_canvas.oncontextmenu = function (e) { return false; };
				this.overlay_canvas.onselectstart = function (e) { return false; };
				this.overlay_canvas.width = Math.round(this.cssWidth * this.devicePixelRatio);
				this.overlay_canvas.height = Math.round(this.cssHeight * this.devicePixelRatio);
				jQuery(this.overlay_canvas).css({"width": this.cssWidth + "px",
												"height": this.cssHeight + "px"});
				this.positionOverlayCanvas();
				this.overlay_ctx = this.overlay_canvas.getContext("2d");
			}
			
			this.glwrap = new cr.GLWrap(this.gl, this.isMobile, this.enableFrontToBack);
			this.glwrap.setSize(this.canvas.width, this.canvas.height);
			this.glwrap.enable_mipmaps = (this.downscalingQuality !== 0);
			
			this.ctx = null;
			
			this.canvas.addEventListener("webglcontextlost", function (ev) {
				ev.preventDefault();
				self.onContextLost();
				cr.logexport("[Construct 2] WebGL context lost");
				window["cr_setSuspended"](true);		// stop rendering
			}, false);
			
			this.canvas.addEventListener("webglcontextrestored", function (ev) {
				self.glwrap.initState();
				self.glwrap.setSize(self.glwrap.width, self.glwrap.height, true);
				self.layer_tex = null;
				self.layout_tex = null;
				self.fx_tex[0] = null;
				self.fx_tex[1] = null;
				self.onContextRestored();
				self.redraw = true;
				cr.logexport("[Construct 2] WebGL context restored");
				window["cr_setSuspended"](false);		// resume rendering
			}, false);
			
			// Look up all object type shader indices			
			for (i = 0, len = this.types_by_index.length; i < len; i++)
			{
				t = this.types_by_index[i];
				
				for (j = 0, lenj = t.effect_types.length; j < lenj; j++)
				{
					s = t.effect_types[j];
					s.shaderindex = this.glwrap.getShaderIndex(s.id);
					s.preservesOpaqueness = this.glwrap.programPreservesOpaqueness(s.shaderindex);
					this.uses_background_blending = this.uses_background_blending || this.glwrap.programUsesDest(s.shaderindex);
				}
			}
			
			// Look up all layout shader indices
			for (i = 0, len = this.layouts_by_index.length; i < len; i++)
			{
				l = this.layouts_by_index[i];
				
				for (j = 0, lenj = l.effect_types.length; j < lenj; j++)
				{
					s = l.effect_types[j];
					s.shaderindex = this.glwrap.getShaderIndex(s.id);
					s.preservesOpaqueness = this.glwrap.programPreservesOpaqueness(s.shaderindex);
				}
				
				l.updateActiveEffects();		// update preserves opaqueness flag
				
				// Look up all layer shader indices
				for (j = 0, lenj = l.layers.length; j < lenj; j++)
				{
					y = l.layers[j];
					
					for (k = 0, lenk = y.effect_types.length; k < lenk; k++)
					{
						s = y.effect_types[k];
						s.shaderindex = this.glwrap.getShaderIndex(s.id);
						s.preservesOpaqueness = this.glwrap.programPreservesOpaqueness(s.shaderindex);
						this.uses_background_blending = this.uses_background_blending || this.glwrap.programUsesDest(s.shaderindex);
					}
					
					y.updateActiveEffects();		// update preserves opaqueness flag
				}
			}
		}
		else
		{
			// Check if using directCanvas.
			if (this.fullscreen_mode > 0 && this.isDirectCanvas)
			{
				log("Using directCanvas renderer");
				
				this.canvas = null;
				document.oncontextmenu = function (e) { return false; };
				document.onselectstart = function (e) { return false; };
				
				this.ctx = AppMobi["canvas"]["getContext"]("2d");
				try {
					this.ctx["samplingMode"] = this.linearSampling ? "smooth" : "sharp";
					this.ctx["globalScale"] = 1;
					this.ctx["HTML5CompatibilityMode"] = true;
					this.ctx["imageSmoothingEnabled"] = this.linearSampling;
				} catch(e){}
				
				if (this.width !== 0 && this.height !== 0)
				{
					this.ctx.width = this.width;
					this.ctx.height = this.height;
				}
			}
			
			// Not DC: just use the normal 2D context.
			if (!this.ctx)
			{
				log("Using Canvas 2D renderer");
				
				if (this.isCocoonJs)
				{
					attribs = {
						"antialias": !!this.linearSampling,
						"alpha": alpha_canvas
					};
					this.ctx = this.canvas.getContext("2d", attribs);
				}
				else
				{
					attribs = {
						"alpha": alpha_canvas
					};
					this.ctx = this.canvas.getContext("2d", attribs);
				}
					
				// Set image smoothing according to the project property
				this.ctx["webkitImageSmoothingEnabled"] = this.linearSampling;
				this.ctx["mozImageSmoothingEnabled"] = this.linearSampling;
				this.ctx["msImageSmoothingEnabled"] = this.linearSampling;
				this.ctx["imageSmoothingEnabled"] = this.linearSampling;
			}
			
			this.overlay_canvas = null;
			this.overlay_ctx = null;
		}
		
		this.tickFunc = function (timestamp) { self.tick(false, timestamp); };
		
		// In framed games, capture click and touch events and focus the game, so keyboard and other inputs work
		if (window != window.top && !this.isDomFree && !this.isWinJS && !this.isWindowsPhone8)
		{			
			document.addEventListener("mousedown", function () {
				window.focus();
			}, true);
			document.addEventListener("touchstart", function () {
				window.focus();
			}, true);
		}
		
		// Preview-only code
		if (typeof cr_is_preview !== "undefined")
		{
			if (this.isCocoonJs)
				console.log("[Construct 2] In preview-over-wifi via CocoonJS mode");
		
			// Load continuous preview
			if (window.location.search.indexOf("continuous") > -1)
			{
				cr.logexport("Reloading for continuous preview");
				this.loadFromSlot = "__c2_continuouspreview";
				this.suspendDrawing = true;
			}
			
			// Pause on blur (unfocus)
			if (this.pauseOnBlur && !this.isMobile)
			{
				jQuery(window).focus(function ()
				{
					self["setSuspended"](false);
				});
				
				jQuery(window).blur(function ()
				{
					self["setSuspended"](true);
				});
			}
		}
		
		// Inform all plugins and behaviors of blur events so they can reset any keyboard key flags
		window.addEventListener("blur", function () {
			self.onWindowBlur();
		});
		
		// Unfocus form controls when a canvas touch event is made or mouse clicks in space.
		// Don't do this in dom-free engines since they don't support form controls anyway and
		// the DOM methods might not be supported.
		if (!this.isDomFree)
		{
			var unfocusFormControlFunc = function (e) {
				// IE9 quirk: document.activeElement can point to the body tag, and calling blur() on the body
				// tag sends the window in to the background, which is annoying. Make sure blur is not called
				// on the body element.
				if (cr.isCanvasInputEvent(e) && document["activeElement"] && document["activeElement"] !== document.getElementsByTagName("body")[0] && document["activeElement"].blur)
				{
					// IE11 sometimes throws here with "incorrect function", which is kind of mysterious,
					// so just ignore that.
					try {
						document["activeElement"].blur();
					}
					catch (e) {}
				}
			}
			
			if (window.navigator["pointerEnabled"])
			{
				document.addEventListener("pointerdown", unfocusFormControlFunc);
			}
			else if (window.navigator["msPointerEnabled"])
			{
				document.addEventListener("MSPointerDown", unfocusFormControlFunc);
			}
			else
			{
				document.addEventListener("touchstart", unfocusFormControlFunc);
			}
			
			document.addEventListener("mousedown", unfocusFormControlFunc);
		}
		
		// Non-fullscreen games on retina displays never call setSize to enable hi-dpi display.
		// Do this now if the device has hi-dpi support.
		if (this.fullscreen_mode === 0 && this.isRetina && this.devicePixelRatio > 1)
		{
			this["setSize"](this.original_width, this.original_height, true);
		}
		
		this.tryLockOrientation();
		
		this.getready();	// determine things to preload
		this.go();			// run loading screen
		
		this.extra = {};
		cr.seal(this);
	};
	
	var webkitRepaintFlag = false;
	
	Runtime.prototype["setSize"] = function (w, h, force)
	{
		var offx = 0, offy = 0;
		var neww = 0, newh = 0, intscale = 0;
		
		// Ignore redundant events
		if (this.lastWindowWidth === w && this.lastWindowHeight === h && !force)
			return;
		
		this.lastWindowWidth = w;
		this.lastWindowHeight = h;
		
		var mode = this.fullscreen_mode;
		var orig_aspect, cur_aspect;
		
		var isfullscreen = (document["mozFullScreen"] || document["webkitIsFullScreen"] || !!document["msFullscreenElement"] || document["fullScreen"] || this.isNodeFullscreen) && !this.isCordova;
		
		if (!isfullscreen && this.fullscreen_mode === 0 && !force)
			return;			// ignore size events when not fullscreen and not using a fullscreen-in-browser mode
		
		if (isfullscreen && this.fullscreen_scaling > 0)
			mode = this.fullscreen_scaling;
		
		var dpr = this.devicePixelRatio;
		
		// Letterbox or letterbox integer scale modes: adjust width and height and offset canvas accordingly
		if (mode >= 4)
		{
			orig_aspect = this.original_width / this.original_height;
			cur_aspect = w / h;
			
			// too wide: scale to fit height
			if (cur_aspect > orig_aspect)
			{
				neww = h * orig_aspect;
				
				if (mode === 5)	// integer scaling
				{
					// integer scale by device pixels, not CSS pixels, since DPR may be non-integral
					intscale = (neww * dpr) / this.original_width;
					if (intscale > 1)
						intscale = Math.floor(intscale);
					else if (intscale < 1)
						intscale = 1 / Math.ceil(1 / intscale);
					neww = this.original_width * intscale / dpr;
					newh = this.original_height * intscale / dpr;
					offx = (w - neww) / 2;
					offy = (h - newh) / 2;
					w = neww;
					h = newh;
				}
				else
				{
					offx = (w - neww) / 2;
					w = neww;
				}
			}
			// otherwise scale to fit width
			else
			{
				newh = w / orig_aspect;
				
				if (mode === 5)	// integer scaling
				{
					intscale = (newh * dpr) / this.original_height;
					if (intscale > 1)
						intscale = Math.floor(intscale);
					else if (intscale < 1)
						intscale = 1 / Math.ceil(1 / intscale);
					neww = this.original_width * intscale / dpr;
					newh = this.original_height * intscale / dpr;
					offx = (w - neww) / 2;
					offy = (h - newh) / 2;
					w = neww;
					h = newh;
				}
				else
				{
					offy = (h - newh) / 2;
					h = newh;
				}
			}
			
			if (isfullscreen && !this.isNWjs)
			{
				offx = 0;
				offy = 0;
			}
		}
		// Centered mode in NW.js: keep canvas size the same and just center it
		else if (this.isNWjs && this.isNodeFullscreen && this.fullscreen_mode_set === 0)
		{
			offx = Math.floor((w - this.original_width) / 2);
			offy = Math.floor((h - this.original_height) / 2);
			w = this.original_width;
			h = this.original_height;
		}
		
		if (mode < 2)
			this.aspect_scale = dpr;
		
		// hacks for iOS retina
		this.cssWidth = Math.round(w);
		this.cssHeight = Math.round(h);
		this.width = Math.round(w * dpr);
		this.height = Math.round(h * dpr);
		this.redraw = true;
		
		if (this.wantFullscreenScalingQuality)
		{
			this.draw_width = this.width;
			this.draw_height = this.height;
			this.fullscreenScalingQuality = true;
		}
		else
		{
			// Render directly even in low-res scale mode if the display area is smaller than the window size area,
			// or in crop mode (since no engine scaling happens)
			if ((this.width < this.original_width && this.height < this.original_height) || mode === 1)
			{
				this.draw_width = this.width;
				this.draw_height = this.height;
				this.fullscreenScalingQuality = true;
			}
			else
			{
				this.draw_width = this.original_width;
				this.draw_height = this.original_height;
				this.fullscreenScalingQuality = false;
				
				/*var orig_aspect = this.original_width / this.original_height;
				var cur_aspect = this.width / this.height;
				
				// note mode 2 (scale inner) inverts this logic and will use window width when width wider.
				if ((this.fullscreen_mode !== 2 && cur_aspect > orig_aspect) || (this.fullscreen_mode === 2 && cur_aspect < orig_aspect))
					this.aspect_scale = this.height / this.original_height;
				else
					this.aspect_scale = this.width / this.original_width;*/
				
				// Scale inner or scale outer mode: adjust the draw size to be proportional
				// to the window size, since the draw size is simply stretched-to-fit in the window
				if (mode === 2)		// scale inner
				{
					orig_aspect = this.original_width / this.original_height;
					cur_aspect = this.lastWindowWidth / this.lastWindowHeight;
					
					if (cur_aspect < orig_aspect)
						this.draw_width = this.draw_height * cur_aspect;
					else if (cur_aspect > orig_aspect)
						this.draw_height = this.draw_width / cur_aspect;
				}
				else if (mode === 3)
				{
					orig_aspect = this.original_width / this.original_height;
					cur_aspect = this.lastWindowWidth / this.lastWindowHeight;
					
					if (cur_aspect > orig_aspect)
						this.draw_width = this.draw_height * cur_aspect;
					else if (cur_aspect < orig_aspect)
						this.draw_height = this.draw_width / cur_aspect;
				}
			}
		}
		
		if (this.canvasdiv && !this.isDomFree)
		{
			jQuery(this.canvasdiv).css({"width": Math.round(w) + "px",
										"height": Math.round(h) + "px",
										"margin-left": Math.floor(offx) + "px",
										"margin-top": Math.floor(offy) + "px"});
										
			if (typeof cr_is_preview !== "undefined")
			{
				jQuery("#borderwrap").css({"width": Math.round(w) + "px",
											"height": Math.round(h) + "px"});
			}
		}
		
		if (this.canvas)
		{
			this.canvas.width = Math.round(w * dpr);
			this.canvas.height = Math.round(h * dpr);
			
			if (this.isEjecta)
			{
				this.canvas.style.left = Math.floor(offx) + "px";
				this.canvas.style.top = Math.floor(offy) + "px";
				this.canvas.style.width = Math.round(w) + "px";
				this.canvas.style.height = Math.round(h) + "px";
			}
			else if (this.isRetina && !this.isDomFree)
			{
				this.canvas.style.width = Math.round(w) + "px";
				this.canvas.style.height = Math.round(h) + "px";
			}
		}
		
		if (this.overlay_canvas)
		{
			this.overlay_canvas.width = Math.round(w * dpr);
			this.overlay_canvas.height = Math.round(h * dpr);
			
			this.overlay_canvas.style.width = this.cssWidth + "px";
			this.overlay_canvas.style.height = this.cssHeight + "px";
		}

		if (this.glwrap)
		{
			this.glwrap.setSize(Math.round(w * dpr), Math.round(h * dpr));
		}
			
		if (this.isDirectCanvas && this.ctx)
		{
			this.ctx.width = Math.round(w);
			this.ctx.height = Math.round(h);
		}
		
		if (this.ctx)
		{
			// Re-apply the image smoothing property, since resizing the canvas resets its state
			this.ctx["webkitImageSmoothingEnabled"] = this.linearSampling;
			this.ctx["mozImageSmoothingEnabled"] = this.linearSampling;
			this.ctx["msImageSmoothingEnabled"] = this.linearSampling;
			this.ctx["imageSmoothingEnabled"] = this.linearSampling;
		}
		
		// Try to lock orientation to the project setting
		this.tryLockOrientation();
		
		// Work around iPhone landscape orientation weirdness. In some cases Safari on iPhone in landscape will
		// bring the address bar down over the page with a scroll offset. This means that despite reporting the
		// correct viewport size and getting the right canvas size, it appears offset under the address bar with
		// an empty space beneath. Forcing the scroll position back to 0 appears to correct this.
		if (this.isiPhone && !this.isCordova)
		{
			window.scrollTo(0, 0);
		}
	};
	
	Runtime.prototype.tryLockOrientation = function ()
	{
		if (!this.autoLockOrientation || this.orientations === 0)
			return;
		
		var orientation = "portrait";
		
		if (this.orientations === 2)
			orientation = "landscape";
		
		// Note IE/Edge can throw exceptions here if in an iframe (WrongDocumentError), which also affects the debugger.
		try {
			// latest API
			if (screen["orientation"] && screen["orientation"]["lock"])
				screen["orientation"]["lock"](orientation);
			// legacy method names
			else if (screen["lockOrientation"])
				screen["lockOrientation"](orientation);
			else if (screen["webkitLockOrientation"])
				screen["webkitLockOrientation"](orientation);
			else if (screen["mozLockOrientation"])
				screen["mozLockOrientation"](orientation);
			else if (screen["msLockOrientation"])
				screen["msLockOrientation"](orientation);
		}
		catch (e)
		{
			if (console && console.warn)
				console.warn("Failed to lock orientation: ", e);
		}
	};
	
	Runtime.prototype.onContextLost = function ()
	{
		this.glwrap.contextLost();
		
		this.is_WebGL_context_lost = true;
		
		var i, len, t;
		for (i = 0, len = this.types_by_index.length; i < len; i++)
		{
			t = this.types_by_index[i];
			
			if (t.onLostWebGLContext)
				t.onLostWebGLContext();
		}
	};
	
	Runtime.prototype.onContextRestored = function ()
	{
		this.is_WebGL_context_lost = false;
		
		// Recreate all object textures
		var i, len, t;
		for (i = 0, len = this.types_by_index.length; i < len; i++)
		{
			t = this.types_by_index[i];
			
			if (t.onRestoreWebGLContext)
				t.onRestoreWebGLContext();
		}
	};

	Runtime.prototype.positionOverlayCanvas = function()
	{
		if (this.isDomFree)
			return;
		
		var isfullscreen = (document["mozFullScreen"] || document["webkitIsFullScreen"] || document["fullScreen"] || !!document["msFullscreenElement"] || this.isNodeFullscreen) && !this.isCordova;
		var overlay_position = isfullscreen ? jQuery(this.canvas).offset() : jQuery(this.canvas).position();
		overlay_position.position = "absolute";
		jQuery(this.overlay_canvas).css(overlay_position);
	};
	
	var caf = window["cancelAnimationFrame"] ||
	  window["mozCancelAnimationFrame"]    ||
	  window["webkitCancelAnimationFrame"] ||
	  window["msCancelAnimationFrame"]     ||
	  window["oCancelAnimationFrame"];
	
	Runtime.prototype["setSuspended"] = function (s)
	{
		var i, len;
		var self = this;
		
		if (s && !this.isSuspended)
		{
			cr.logexport("[Construct 2] Suspending");
			this.isSuspended = true;			// next tick will be last
			
			if (this.raf_id !== -1 && caf)		// note: CocoonJS does not implement cancelAnimationFrame
				caf(this.raf_id);
			if (this.timeout_id !== -1)
				clearTimeout(this.timeout_id);
			
			for (i = 0, len = this.suspend_events.length; i < len; i++)
				this.suspend_events[i](true);
				
			/**BEGIN-PREVIEWONLY**/
			if (this.isDebug)
			{
				var breakstr = "";
				
				if (this.breakpoint_event)
				{
					breakstr = this.breakpoint_event.sheet.name + ", event " + this.breakpoint_event.display_number;
					
					if (this.breakpoint_condition)
						breakstr += ", condition " + (this.breakpoint_condition.index + 1);
					else if (this.breakpoint_action)
						breakstr += ", action " + (this.breakpoint_action.index + 1);
				}
				
				debuggerSuspended(true, this.hit_breakpoint, breakstr);
			}
			/**END-PREVIEWONLY**/
		}
		else if (!s && this.isSuspended)
		{
			cr.logexport("[Construct 2] Resuming");
			this.isSuspended = false;
			this.last_tick_time = cr.performance_now();	// ensure first tick is a zero-dt one
			this.last_fps_time = cr.performance_now();	// reset FPS counter
			this.framecount = 0;
			this.logictime = 0;
			
			for (i = 0, len = this.suspend_events.length; i < len; i++)
				this.suspend_events[i](false);
				
			/**PREVIEWONLY**/if (this.isDebug) debuggerSuspended(false, false, "");
			
			this.tick(false);						// kick off runtime again
		}
	};
	
	Runtime.prototype.addSuspendCallback = function (f)
	{
		this.suspend_events.push(f);
	};
	
	Runtime.prototype.GetObjectReference = function (i)
	{
		assert2(i >= 0 && i < this.objectRefTable.length, "Object reference index out of range");
		return this.objectRefTable[i];
	};
	
	// Load the runtime scripts and data
	Runtime.prototype.loadProject = function (data_response)
	{
		assert2(data_response && data_response["project"], "Project model unavailable");
		if (!data_response || !data_response["project"])
			cr.logerror("Project model unavailable");
		
		var pm = data_response["project"];
		
		this.name = pm[0];
		this.first_layout = pm[1];
		
		// Determine fullscreen mode - needed before object creation
		this.fullscreen_mode = pm[12];	// 0 = off, 1 = crop, 2 = scale inner, 3 = scale outer, 4 = letterbox scale, 5 = integer letterbox scale
		this.fullscreen_mode_set = pm[12];
		
		this.original_width = pm[10];
		this.original_height = pm[11];
		
		this.parallax_x_origin = this.original_width / 2;
		this.parallax_y_origin = this.original_height / 2;
		
		// Fall back to 'scale' in DOM-free engines, need a DOM to make letterbox work
		// Exception: Ejecta supports this
		if (this.isDomFree && !this.isEjecta && (pm[12] >= 4 || pm[12] === 0))
		{
			cr.logexport("[Construct 2] Letterbox scale fullscreen modes are not supported on this platform - falling back to 'Scale outer'");
			this.fullscreen_mode = 3;
			this.fullscreen_mode_set = 3;
		}
		
		// Determine loader layout - also needed before object creation
		this.uses_loader_layout = pm[18];
		
		// Determine loader style - need to start loading logo before anything else if it's to be shown
		this.loaderstyle = pm[19];
		
		if (this.loaderstyle === 0)
		{
			var loaderImage = new Image();
			loaderImage.crossOrigin = "anonymous";
			this.setImageSrc(loaderImage, "loading-logo.png");
			
			this.loaderlogos = {
				logo: loaderImage
			};
		}
		else if (this.loaderstyle === 4)	// c2 splash
		{
			var loaderC2logo_1024 = new Image();
			loaderC2logo_1024.src = "{{{splash-c2logo-1024}}}";
			var loaderC2logo_512 = new Image();
			loaderC2logo_512.src = "{{{splash-c2logo-512}}}";
			var loaderC2logo_256 = new Image();
			loaderC2logo_256.src = "{{{splash-c2logo-256}}}";
			var loaderC2logo_128 = new Image();
			loaderC2logo_128.src = "{{{splash-c2logo-128}}}";
			
			var loaderPowered_1024 = new Image();
			loaderPowered_1024.src = "{{{splash-powered-1024}}}";
			var loaderPowered_512 = new Image();
			loaderPowered_512.src = "{{{splash-powered-512}}}";
			var loaderPowered_256 = new Image();
			loaderPowered_256.src = "{{{splash-powered-256}}}";
			var loaderPowered_128 = new Image();
			loaderPowered_128.src = "{{{splash-powered-128}}}";
			
			var loaderWebsite_1024 = new Image();
			loaderWebsite_1024.src = "{{{splash-website-1024}}}";
			var loaderWebsite_512 = new Image();
			loaderWebsite_512.src = "{{{splash-website-512}}}";
			var loaderWebsite_256 = new Image();
			loaderWebsite_256.src = "{{{splash-website-256}}}";
			var loaderWebsite_128 = new Image();
			loaderWebsite_128.src = "{{{splash-website-128}}}";
			
			this.loaderlogos = {
				logo: [loaderC2logo_1024, loaderC2logo_512, loaderC2logo_256, loaderC2logo_128],
				powered: [loaderPowered_1024, loaderPowered_512, loaderPowered_256, loaderPowered_128],
				website: [loaderWebsite_1024, loaderWebsite_512, loaderWebsite_256, loaderWebsite_128]
			};
		}
		
		this.next_uid = pm[21];

		// First load of the object reference table. Note some common ACEs are not added yet and will return undefined -
		// this is just to get access to plugin/behavior ctors
		this.objectRefTable = cr.getObjectRefTable();
		
		// Create the system object
		this.system = new cr.system_object(this);

		// For each plugin, create a new plugin instance.
		var i, len, j, lenj, k, lenk, idstr, m, b, t, f, p;
		var plugin, plugin_ctor;
		
		for (i = 0, len = pm[2].length; i < len; i++)
		{
			m = pm[2][i];
			p = this.GetObjectReference(m[0]);
			assert2(p, "A plugin is missing.  Check the plugin IDs match in edittime and runtime scripts.  Note this can also occur when there is an error in a plugin script that prevents the browser from loading the script - check the error console.");
			
			// Add common ACEs for the plugin
			cr.add_common_aces(m, p.prototype);

			// Create new plugin instance
			plugin = new p(this);
			plugin.singleglobal = m[1];
			plugin.is_world = m[2];
			plugin.must_predraw = m[9];

			if (plugin.onCreate)
				plugin.onCreate();  // opportunity to override default ACEs

			cr.seal(plugin);
			this.plugins.push(plugin);
		}
		
		// Common ACEs have been added above. To ensure references to common ACEs resolve correctly,
		// reload the object reference table: some undefined references will now return the common ACE.
		this.objectRefTable = cr.getObjectRefTable();

		// Create object types
		for (i = 0, len = pm[3].length; i < len; i++)
		{
			m = pm[3][i];
			
			plugin_ctor = this.GetObjectReference(m[1]);
			assert2(plugin_ctor, "No plugin ctor provided for object type");
			plugin = null;
			
			// find the plugin instance matching the ctor
			for (j = 0, lenj = this.plugins.length; j < lenj; j++)
			{
				if (this.plugins[j] instanceof plugin_ctor)
				{
					plugin = this.plugins[j];
					break;
				}
			}
			
			// Create a new object type from the plugin
			assert2(plugin, "Cannot find plugin for object type");
			assert2(plugin.Type, "Plugin does not have a Type class");
			
			var type_inst = new plugin.Type(plugin);
			
			assert2(type_inst.plugin, "Plugin's Type object must save this.plugin, runtime depends on it");

			// Merge the model data in to the instance
			type_inst.name = m[0];
			type_inst.is_family = m[2];
			type_inst.instvar_sids = m[3].slice(0);
			type_inst.vars_count = m[3].length;
			type_inst.behs_count = m[4];
			type_inst.fx_count = m[5];
			type_inst.sid = m[11];
			
			if (type_inst.is_family)
			{
				type_inst.members = [];				// types in this family
				type_inst.family_index = this.family_count++;
				type_inst.families = null;
			}
			else
			{
				type_inst.members = null;
				type_inst.family_index = -1;
				type_inst.families = [];			// families this type belongs to
			}
			
			type_inst.family_var_map = null;
			type_inst.family_beh_map = null;
			type_inst.family_fx_map = null;
			
			// Container variables - assigned after this loop as created all object types
			type_inst.is_contained = false;
			type_inst.container = null;
			
			// Texture
			if (m[6])
			{
				type_inst.texture_file = m[6][0];
				type_inst.texture_filesize = m[6][1];
				type_inst.texture_pixelformat = m[6][2];
			}
			else
			{
				type_inst.texture_file = null;
				type_inst.texture_filesize = 0;
				type_inst.texture_pixelformat = 0;		// rgba8
			}
			
			// Animations
			if (m[7])
			{
				type_inst.animations = m[7];
			}
			else
			{
				type_inst.animations = null;
			}
			
			// Add in runtime-provided object type features
			type_inst.index = i;                                // save index in to types array in type
			type_inst.instances = [];                           // all instances of this type
			type_inst.deadCache = [];							// destroyed instances to recycle next create
			type_inst.solstack = [new cr.selection(type_inst)]; // initialise SOL stack with one empty SOL
			type_inst.cur_sol = 0;
			type_inst.default_instance = null;
			type_inst.default_layerindex = 0;
			type_inst.stale_iids = true;
			type_inst.updateIIDs = cr.type_updateIIDs;
			type_inst.getFirstPicked = cr.type_getFirstPicked;
			type_inst.getPairedInstance = cr.type_getPairedInstance;
			type_inst.getCurrentSol = cr.type_getCurrentSol;
			type_inst.pushCleanSol = cr.type_pushCleanSol;
			type_inst.pushCopySol = cr.type_pushCopySol;
			type_inst.popSol = cr.type_popSol;
			type_inst.getBehaviorByName = cr.type_getBehaviorByName;
			type_inst.getBehaviorIndexByName = cr.type_getBehaviorIndexByName;
			type_inst.getEffectIndexByName = cr.type_getEffectIndexByName;
			type_inst.applySolToContainer = cr.type_applySolToContainer;
			type_inst.getInstanceByIID = cr.type_getInstanceByIID;
			type_inst.collision_grid = new cr.SparseGrid(this.original_width, this.original_height);
			type_inst.any_cell_changed = true;
			type_inst.any_instance_parallaxed = false;
			type_inst.extra = {};
			type_inst.toString = cr.type_toString;

			// Create each of the type's behaviors
			type_inst.behaviors = [];

			for (j = 0, lenj = m[8].length; j < lenj; j++)
			{
				b = m[8][j];
				var behavior_ctor = this.GetObjectReference(b[1]);
				var behavior_plugin = null;
				
				// Try to find a created plugin matching ctor
				for (k = 0, lenk = this.behaviors.length; k < lenk; k++)
				{
					if (this.behaviors[k] instanceof behavior_ctor)
					{
						behavior_plugin = this.behaviors[k];
						break;
					}
				}

				// Is behavior-plugin not yet created?
				if (!behavior_plugin)
				{
					// Create new behavior-plugin instance
					behavior_plugin = new behavior_ctor(this);
					behavior_plugin.my_types = [];						// types using this behavior
					behavior_plugin.my_instances = new cr.ObjectSet(); 	// instances of this behavior

					if (behavior_plugin.onCreate)
						behavior_plugin.onCreate();
						
					cr.seal(behavior_plugin);

					// Save the behavior
					this.behaviors.push(behavior_plugin);
					
					if (cr.behaviors.solid && behavior_plugin instanceof cr.behaviors.solid)
						this.solidBehavior = behavior_plugin;
					
					if (cr.behaviors.jumpthru && behavior_plugin instanceof cr.behaviors.jumpthru)
						this.jumpthruBehavior = behavior_plugin;
					
					if (cr.behaviors.shadowcaster && behavior_plugin instanceof cr.behaviors.shadowcaster)
						this.shadowcasterBehavior = behavior_plugin;
				}
				
				// Record all types that make use of the behavior
				if (behavior_plugin.my_types.indexOf(type_inst) === -1)
					behavior_plugin.my_types.push(type_inst);

				// Create the behavior-type
				var behavior_type = new behavior_plugin.Type(behavior_plugin, type_inst);
				behavior_type.name = b[0];
				behavior_type.sid = b[2];
				behavior_type.onCreate();
				cr.seal(behavior_type);

				type_inst.behaviors.push(behavior_type);
			}
			
			// Global setting
			type_inst.global = m[9];
			
			// Is on loader layout
			type_inst.isOnLoaderLayout = m[10];
			
			// Assign shaders
			type_inst.effect_types = [];
			
			for (j = 0, lenj = m[12].length; j < lenj; j++)
			{
				type_inst.effect_types.push({
					id: m[12][j][0],
					name: m[12][j][1],
					shaderindex: -1,
					preservesOpaqueness: false,
					active: true,
					index: j
				});
			}
			
			// Store tilemap collision polys (if any)
			type_inst.tile_poly_data = m[13];
			
			// Create and seal.  However note when using loader layouts, defer creation of
			// object types not on the loader layout at this point.  Images are loaded in
			// type creation so we want to wait until the loader layout finishes loading, then
			// create all the remaining types and wait for loading to finish again.
			// Also create all non-world plugins immediately, since they are already ready.
			if (!this.uses_loader_layout || type_inst.is_family || type_inst.isOnLoaderLayout || !plugin.is_world)
			{
				type_inst.onCreate();				
				cr.seal(type_inst);
			}

			// Add to the types object and types by index list.  Sometimes names are not exported
			if (type_inst.name)
				this.types[type_inst.name] = type_inst;
				
			this.types_by_index.push(type_inst);

			// If a single-global, create the instance now
			if (plugin.singleglobal)
			{
				var instance = new plugin.Instance(type_inst);

				instance.uid = this.next_uid++;
				instance.puid = this.next_puid++;
				instance.iid = 0;
				instance.get_iid = cr.inst_get_iid;
				instance.toString = cr.inst_toString;
				instance.properties = m[14];

				instance.onCreate();
				cr.seal(instance);

				type_inst.instances.push(instance);
				this.objectsByUid[instance.uid.toString()] = instance;
			}
		}
		
		// Set families
		for (i = 0, len = pm[4].length; i < len; i++)
		{
			var familydata = pm[4][i];
			var familytype = this.types_by_index[familydata[0]];
			var familymember;
			
			for (j = 1, lenj = familydata.length; j < lenj; j++)
			{
				familymember = this.types_by_index[familydata[j]];
				familymember.families.push(familytype);
				familytype.members.push(familymember);
			}
		}
		
		// Assemble containers
		for (i = 0, len = pm[28].length; i < len; i++)
		{
			var containerdata = pm[28][i];
			var containertypes = [];
			
			for (j = 0, lenj = containerdata.length; j < lenj; j++)
				containertypes.push(this.types_by_index[containerdata[j]]);
			
			for (j = 0, lenj = containertypes.length; j < lenj; j++)
			{
				containertypes[j].is_contained = true;
				containertypes[j].container = containertypes;
			}
		}
		
		// Map instance variables, behaviors and effects for families
		if (this.family_count > 0)
		{
			for (i = 0, len = this.types_by_index.length; i < len; i++)
			{
				t = this.types_by_index[i];
				
				if (t.is_family || !t.families.length)
					continue;
					
				t.family_var_map = new Array(this.family_count);
				t.family_beh_map = new Array(this.family_count);
				t.family_fx_map = new Array(this.family_count);
				var all_fx = [];
					
				var varsum = 0;
				var behsum = 0;
				var fxsum = 0;
				
				for (j = 0, lenj = t.families.length; j < lenj; j++)
				{
					f = t.families[j];
					t.family_var_map[f.family_index] = varsum;
					varsum += f.vars_count;
					t.family_beh_map[f.family_index] = behsum;
					behsum += f.behs_count;
					t.family_fx_map[f.family_index] = fxsum;
					fxsum += f.fx_count;
					
					// Build list of all effect types including inherited for this object type.
					// Make shallow copies so we can set the correct index for each type
					for (k = 0, lenk = f.effect_types.length; k < lenk; k++)
						all_fx.push(cr.shallowCopy({}, f.effect_types[k]));
				}
				
				// Update effect types array to include inherited
				t.effect_types = all_fx.concat(t.effect_types);
				
				for (j = 0, lenj = t.effect_types.length; j < lenj; j++)
					t.effect_types[j].index = j;
			}
		}

		// Create layouts
		for (i = 0, len = pm[5].length; i < len; i++)
		{
			m = pm[5][i];
			
			var layout = new cr.layout(this, m);
			cr.seal(layout);

			// Add by name and index
			this.layouts[layout.name] = layout;
			this.layouts_by_index.push(layout);
		}

		// Create event sheets
		for (i = 0, len = pm[6].length; i < len; i++)
		{
			m = pm[6][i];
			
			var sheet = new cr.eventsheet(this, m);
			cr.seal(sheet);

			// Add by name and index
			this.eventsheets[sheet.name] = sheet;
			this.eventsheets_by_index.push(sheet);
		}
		
		// Post-initialise the event system, now that all variables are available
		for (i = 0, len = this.eventsheets_by_index.length; i < len; i++)
			this.eventsheets_by_index[i].postInit();
		
		for (i = 0, len = this.eventsheets_by_index.length; i < len; i++)
			this.eventsheets_by_index[i].updateDeepIncludes();

		for (i = 0, len = this.triggers_to_postinit.length; i < len; i++)
			this.triggers_to_postinit[i].postInit();
			
		// Done with trigger postinit
		cr.clearArray(this.triggers_to_postinit)
		
		// Audio to preload if preloadSounds is set
		this.audio_to_preload = pm[7];
		
		// Set files subfolder
		this.files_subfolder = pm[8];
		
		// Set pixel rounding mode
		this.pixel_rounding = pm[9];
		
		this.aspect_scale = 1.0;
		
		// determined before object creation
		//this.fullscreen_mode = pm[11];
		
		this.enableWebGL = pm[13];
		this.linearSampling = pm[14];
		this.alphaBackground = pm[15];
		this.versionstr = pm[16];
		
		this.useHighDpi = pm[17];
		
		this.orientations = pm[20];		// 0 = any, 1 = portrait, 2 = landscape
		this.autoLockOrientation = (this.orientations > 0);
		this.pauseOnBlur = pm[22];
		this.wantFullscreenScalingQuality = pm[23];		// false = low quality, true = high quality
		this.fullscreenScalingQuality = this.wantFullscreenScalingQuality;
		
		this.downscalingQuality = pm[24];	// 0 = low (mips off), 1 = medium (mips on, dense spritesheet), 2 = high (mips on, sparse spritesheet)
		
		this.preloadSounds = pm[25];		// 0 = no, 1 = yes
		this.projectName = pm[26];
		this.enableFrontToBack = pm[27] && !this.isIE;		// front-to-back renderer disabled in IE (but not Edge)
		
		// Get the start time of the application in ms for loading screen
		this.start_time = Date.now();
		
		// Done with the object reference table, can recycle it now
		cr.clearArray(this.objectRefTable);
		
		// Next loading phase
		this.initRendererAndLoader();
	};
	
	var anyImageHadError = false;
	
	Runtime.prototype.waitForImageLoad = function (img_, src_)
	{
		// For CocoonJS, enable lazy loading on all images since that is what real browsers do,
		// and diverging from that causes problems
		img_["cocoonLazyLoad"] = true;
		
		// Attach error handler before assigning src to ensure errors are caught.
		// If any image has an error loading, the progress bar turns red and the game will fail to load.
		img_.onerror = function (e)
		{
			img_.c2error = true;
			anyImageHadError = true;
			
			if (console && console.error)
				console.error("Error loading image '" + img_.src + "': ", e);
		};
		
		// Ejecta has a bug where you can't read the src before setting it, so handle it separately.
		if (this.isEjecta)
		{
			// load normally
			img_.src = src_;
		}
		// Backwards compatibility with old plugins: previously there was no src parameter to this function
		// and callers set img_.src before this call. Don't handle the new behavior if the src has already
		// been set.
		else if (!img_.src)
		{
			// Expansion APK reader is available
			if (typeof XAPKReader !== "undefined")
			{
				// Expand the src file, await completion, then assign the resulting src
				XAPKReader.get(src_, function (expanded_url)
				{
					// start loading image from expanded path
					img_.src = expanded_url;
				
				}, function (e)
				{
					// error expanding file
					img_.c2error = true;
					anyImageHadError = true;
					
					if (console && console.error)
						console.error("Error extracting image '" + src_ + "' from expansion file: ", e);
				});
			}
			else
			{
				// load normally
				img_.crossOrigin = "anonymous";			// required for Arcade sandbox compatibility
				this.setImageSrc(img_, src_);			// work around WKWebView problems
			}
		}
		
		this.wait_for_textures.push(img_);
	};
	
	Runtime.prototype.findWaitingTexture = function (src_)
	{
		var i, len;
		for (i = 0, len = this.wait_for_textures.length; i < len; i++)
		{
			if (this.wait_for_textures[i].cr_src === src_)
				return this.wait_for_textures[i];
		}
		
		return null;
	};
	
	var audio_preload_totalsize = 0;
	var audio_preload_started = false;
	
	Runtime.prototype.getready = function ()
	{
		// No audio instance: no point trying to preload any audio
		if (!this.audioInstance)
			return;
		
		audio_preload_totalsize = this.audioInstance.setPreloadList(this.audio_to_preload);
	};

	Runtime.prototype.areAllTexturesAndSoundsLoaded = function ()
	{
		var totalsize = audio_preload_totalsize;
		var completedsize = 0;
		var audiocompletedsize = 0;
		var ret = true;

		var i, len, img;
		for (i = 0, len = this.wait_for_textures.length; i < len; i++)
		{
			img = this.wait_for_textures[i];
			
			var filesize = img.cr_filesize;

			// No filesize provided - oops, plugin dev messed up.
			// Assume 50kb so some progress happens.
			if (!filesize || filesize <= 0)
				filesize = 50000;

			totalsize += filesize;

			// Image finished loading? (DirectCanvas uses a loaded flag instead)
			// Note images with no src may be awaiting decompression from expansion APK
			// so don't count them as completed
			if (!!img.src && (img.complete || img["loaded"]) && !img.c2error)
				completedsize += filesize;
			else
				ret = false;    // not all textures loaded
		}
		
		// All images finished loading: preload sounds if enabled
		if (ret && this.preloadSounds && this.audioInstance)
		{
			if (!audio_preload_started)
			{
				this.audioInstance.startPreloads();
				audio_preload_started = true;
			}
			
			audiocompletedsize = this.audioInstance.getPreloadedSize();
			
			completedsize += audiocompletedsize;
			
			if (audiocompletedsize < audio_preload_totalsize)
				ret = false;		// not done yet
		}

		if (totalsize == 0)
			this.progress = 1;		// indicate to C2 splash loader that it can finish now
		else
			this.progress = (completedsize / totalsize);

		return ret;
	};
	
	var isC2SplashDone = false;

	// Start the runtime running
	Runtime.prototype.go = function ()
	{
		// No canvas support
		if (!this.ctx && !this.glwrap)
			return;
			
		// Use either 2D context or WebGL overlay context to draw progress bar - 
		// both are 2D contexts so the code can be recycled
		var ctx = this.ctx || this.overlay_ctx;
		
		// Position overlay canvas if any
		if (this.overlay_canvas)
			this.positionOverlayCanvas();

		// Watch for window size changes during loading
		var curwidth = window.innerWidth;
		var curheight = window.innerHeight;
		if (this.lastWindowWidth !== curwidth || this.lastWindowHeight !== curheight)
		{
			this["setSize"](curwidth, curheight);
		}
		
		this.progress = 0;
		this.last_progress = -1;
		var self = this;

		// Wait for any pending textures or audio to finish loading then forward to go_loading_finished
		if (this.areAllTexturesAndSoundsLoaded() && (this.loaderstyle !== 4 || isC2SplashDone))
		{
			this.go_loading_finished();
		}
		else
		{
			// Post progress to debugger if present
			/**PREVIEWONLY**/if (this.isDebug) debuggerLoadingProgress(this.progress);
			
			// Draw loading screen on canvas.  areAllTexturesAndSoundsLoaded set this.progress.
			// Don't display anything for the first 500ms, so quick loads don't distractingly flash a progress message.
			// Loader styles: 0 = progress bar & logo; 1 = progress bar only; 2 = percentage text; 3 = nothing
			var ms_elapsed = Date.now() - this.start_time;

			if (ctx)
			{
				var overlay_width = this.width;
				var overlay_height = this.height;
				var dpr = this.devicePixelRatio;
				
				// Always redraw loader in CocoonJS since otherwise it may flicker due to screencanvas
				if (this.loaderstyle < 3 && (this.isCocoonJs || (ms_elapsed >= 500 && this.last_progress != this.progress)))
				{
					ctx.clearRect(0, 0, overlay_width, overlay_height);
					var mx = overlay_width / 2;
					var my = overlay_height / 2;
					var haslogo = (this.loaderstyle === 0 && this.loaderlogos.logo.complete);
					var hlw = 40 * dpr;
					var hlh = 0;
					var logowidth = 80 * dpr;
					var logoheight;
					
					if (haslogo)
					{
						var loaderLogoImage = this.loaderlogos.logo;
						logowidth = loaderLogoImage.width * dpr;
						logoheight = loaderLogoImage.height * dpr;
						hlw = logowidth / 2;
						hlh = logoheight / 2;
						ctx.drawImage(loaderLogoImage, cr.floor(mx - hlw), cr.floor(my - hlh), logowidth, logoheight);
					}
					
					// draw progress bar
					if (this.loaderstyle <= 1)
					{
						my += hlh + (haslogo ? 12 * dpr : 0);
						mx -= hlw;
						mx = cr.floor(mx) + 0.5;
						my = cr.floor(my) + 0.5;
						
						// make bar go red if error occurs
						ctx.fillStyle = anyImageHadError ? "red" : "DodgerBlue";
						ctx.fillRect(mx, my, Math.floor(logowidth * this.progress), 6 * dpr);
						ctx.strokeStyle = "black";
						ctx.strokeRect(mx, my, logowidth, 6 * dpr);
						ctx.strokeStyle = "white";
						ctx.strokeRect(mx - 1 * dpr, my - 1 * dpr, logowidth + 2 * dpr, 8 * dpr);
					}
					// draw percentage text
					else if (this.loaderstyle === 2)
					{
						ctx.font = (this.isEjecta ? "12pt ArialMT" : "12pt Arial");
						ctx.fillStyle = anyImageHadError ? "#f00" : "#999";
						ctx.textBaseLine = "middle";
						var percent_text = Math.round(this.progress * 100) + "%";
						var text_dim = ctx.measureText ? ctx.measureText(percent_text) : null;
						var text_width = text_dim ? text_dim.width : 0;
						ctx.fillText(percent_text, mx - (text_width / 2), my);
					}
					
					this.last_progress = this.progress;
				}
				else if (this.loaderstyle === 4)
				{
					this.draw_c2_splash_loader(ctx);
					
					// use raf-driven animation instead of slow timer
					if (raf)
						raf(function() { self.go(); });
					else
						setTimeout(function() { self.go(); }, 16);
					
					return;
				}
			}

			// Call again after 100ms (CocoonJS: redraw every frame)
			setTimeout(function() { self.go(); }, (this.isCocoonJs ? 10 : 100));
		}
	};
	
	var splashStartTime = -1;
	var splashFadeInDuration = 300;
	var splashFadeOutDuration = 300;
	var splashAfterFadeOutWait = (typeof cr_is_preview === "undefined" ? 200 : 0);
	var splashIsFadeIn = true;
	var splashIsFadeOut = false;
	var splashFadeInFinish = 0;
	var splashFadeOutStart = 0;
	var splashMinDisplayTime = (typeof cr_is_preview === "undefined" ? 3000 : 0);
	var renderViaCanvas = null;
	var renderViaCtx = null;
	var splashFrameNumber = 0;
	
	function maybeCreateRenderViaCanvas(w, h)
	{
		if (!renderViaCanvas || renderViaCanvas.width !== w || renderViaCanvas.height !== h)
		{
			renderViaCanvas = document.createElement("canvas");
			renderViaCanvas.width = w;
			renderViaCanvas.height = h;
			renderViaCtx = renderViaCanvas.getContext("2d");
		}
	};
	
	function mipImage(arr, size)
	{
		if (size <= 128)
			return arr[3];
		else if (size <= 256)
			return arr[2];
		else if (size <= 512)
			return arr[1];
		else
			return arr[0];
	};
	
	Runtime.prototype.draw_c2_splash_loader = function(ctx)
	{
		if (isC2SplashDone)
			return;
		
		var w = Math.ceil(this.width);
		var h = Math.ceil(this.height);
		var dpr = this.devicePixelRatio;
		
		var logoimages = this.loaderlogos.logo;
		var poweredimages = this.loaderlogos.powered;
		var websiteimages = this.loaderlogos.website;
		
		// If any images are not ready, return and wait until they are
		for (var i = 0; i < 4; ++i)
		{
			if (!logoimages[i].complete || !poweredimages[i].complete || !websiteimages[i].complete)
				return;
		}
		
		// First draw
		if (splashFrameNumber === 0)
			splashStartTime = Date.now();
		
		var nowTime = Date.now();
		var isRenderingVia = false;
		var renderToCtx = ctx;
		var drawW, drawH;
		
		if (splashIsFadeIn || splashIsFadeOut)
		{
			ctx.clearRect(0, 0, w, h);
		
			maybeCreateRenderViaCanvas(w, h);
			renderToCtx = renderViaCtx;
			isRenderingVia = true;
			
			// Note we only really start the fade-in from the second frame. This is to avoid any jank on the first
			// frame (which has to create an extra canvas and possibly load GPU textures) and ensure the actual
			// fade-in transition itself can run smoothly.
			if (splashIsFadeIn && splashFrameNumber === 1)
				splashStartTime = Date.now();
		}
		else
		{
			ctx.globalAlpha = 1;
		}
		
		renderToCtx.fillStyle = "#333333";
		renderToCtx.fillRect(0, 0, w, h);
		
		// Style 1: full height
		if (this.cssHeight > 256)
		{
			// 'Powered by' text
			drawW = cr.clamp(h * 0.22, 105, w * 0.6);
			drawH = drawW * 0.25;
			renderToCtx.drawImage(mipImage(poweredimages, drawW), w * 0.5 - drawW/2, h * 0.2 - drawH/2, drawW, drawH);
			
			// C2 logo
			drawW = Math.min(h * 0.395, w * 0.95);
			drawH = drawW;
			renderToCtx.drawImage(mipImage(logoimages, drawW), w * 0.5 - drawW/2, h * 0.485 - drawH/2, drawW, drawH);
			
			// Website text
			drawW = cr.clamp(h * 0.22, 105, w * 0.6);
			drawH = drawW * 0.25;
			renderToCtx.drawImage(mipImage(websiteimages, drawW), w * 0.5 - drawW/2, h * 0.868 - drawH/2, drawW, drawH);
			
			// Progress bar background
			renderToCtx.fillStyle = "#3C3C3C";
			drawW = w;
			drawH = Math.max(h * 0.005, 2);
			renderToCtx.fillRect(0, h * 0.8 - drawH/2, drawW, drawH);
			
			// Progress bar fill
			renderToCtx.fillStyle = anyImageHadError ? "red" : "#E0FF65";
			drawW = w * this.progress;
			renderToCtx.fillRect(w * 0.5 - drawW/2, h * 0.8 - drawH/2, drawW, drawH);
		}
		// Style 2: narrow height
		else
		{
			// C2 logo
			drawW = h * 0.55;
			drawH = drawW;
			renderToCtx.drawImage(mipImage(logoimages, drawW), w * 0.5 - drawW/2, h * 0.45 - drawH/2, drawW, drawH);
			
			// Progress bar background
			renderToCtx.fillStyle = "#3C3C3C";
			drawW = w;
			drawH = Math.max(h * 0.005, 2);
			renderToCtx.fillRect(0, h * 0.85 - drawH/2, drawW, drawH);
			
			// Progress bar fill
			renderToCtx.fillStyle = anyImageHadError ? "red" : "#E0FF65";
			drawW = w * this.progress;
			renderToCtx.fillRect(w * 0.5 - drawW/2, h * 0.85 - drawH/2, drawW, drawH);
		}
		
		
		if (isRenderingVia)
		{
			if (splashIsFadeIn)
			{
				if (splashFrameNumber === 0)
					ctx.globalAlpha = 0;
				else
					ctx.globalAlpha = Math.min((nowTime - splashStartTime) / splashFadeInDuration, 1);
			}
			else if (splashIsFadeOut)
			{
				ctx.globalAlpha = Math.max(1 - (nowTime - splashFadeOutStart) / splashFadeOutDuration, 0);
			}
				
			ctx.drawImage(renderViaCanvas, 0, 0, w, h);
		}
		
		if (splashIsFadeIn && nowTime - splashStartTime >= splashFadeInDuration && splashFrameNumber >= 2)
		{
			splashIsFadeIn = false;
			splashFadeInFinish = nowTime;
		}
		
		if (!splashIsFadeIn && nowTime - splashFadeInFinish >= splashMinDisplayTime && !splashIsFadeOut && this.progress >= 1)
		{
			splashIsFadeOut = true;
			splashFadeOutStart = nowTime;
		}
		
		// Note there are two ways we end the C2 splash:
		// 1) normally, after the splash fade out and wait
		// 2) in preview mode, if it loads quicker than 500ms, just skip straight to the game to avoid getting in the way
		if ((splashIsFadeOut && nowTime - splashFadeOutStart >= splashFadeOutDuration + splashAfterFadeOutWait) ||
			(typeof cr_is_preview !== "undefined" && this.progress >= 1 && Date.now() - splashStartTime < 500))
		{
			isC2SplashDone = true;
			splashIsFadeIn = false;
			splashIsFadeOut = false;
			renderViaCanvas = null;
			renderViaCtx = null;
			this.loaderlogos = null;
		}
		
		++splashFrameNumber;
	};
	
	// Run once textures have all completed
	Runtime.prototype.go_loading_finished = function ()
	{
		// Remove overlay canvas if any
		if (this.overlay_canvas)
		{
			this.canvas.parentNode.removeChild(this.overlay_canvas);
			this.overlay_ctx = null;
			this.overlay_canvas = null;
		}
		
		// Reset the start time
		this.start_time = Date.now();
		this.last_fps_time = cr.performance_now();       // for counting framerate
		
		// Initialise debugger
		/**PREVIEWONLY**/if (this.isDebug) debuggerInit(this);
		
		var i, len, t;
		
		// Create the rest of the types in the project if using loader layout
		if (this.uses_loader_layout)
		{
			for (i = 0, len = this.types_by_index.length; i < len; i++)
			{
				t = this.types_by_index[i];
				
				if (!t.is_family && !t.isOnLoaderLayout && t.plugin.is_world)
				{
					t.onCreate();
					cr.seal(t);
				}
			}
			
			// Now wait_for_textures has extra images waiting to be loaded...
		}
		else
			this.isloading = false;
			
		// Create all global non-world instances in all layouts
		for (i = 0, len = this.layouts_by_index.length; i < len; i++)
		{
			this.layouts_by_index[i].createGlobalNonWorlds();
		}
		
		// make sure aspect scale is correctly set in advance of first tick
		if (this.fullscreen_mode >= 2)
		{
			var orig_aspect = this.original_width / this.original_height;
			var cur_aspect = this.width / this.height;
			
			// note mode 2 (scale inner) inverts this logic and will use window width when width wider.
			if ((this.fullscreen_mode !== 2 && cur_aspect > orig_aspect) || (this.fullscreen_mode === 2 && cur_aspect < orig_aspect))
				this.aspect_scale = this.height / this.original_height;
			else
				this.aspect_scale = this.width / this.original_width;
		}
		
		// Find the first layout and start it running
		if (this.first_layout)
			this.layouts[this.first_layout].startRunning();
		else
			this.layouts_by_index[0].startRunning();

		assert2(this.running_layout, "Could not find first layout to start running");
		
		// Is not using a loader layout: fire 'On loaded' now anyway
		if (!this.uses_loader_layout)
		{
			this.loadingprogress = 1;
			this.trigger(cr.system_object.prototype.cnds.OnLoadFinished, null);
		}
		
		// Hide splash screen in Crosswalk
		if (navigator["splashscreen"] && navigator["splashscreen"]["hide"])
			navigator["splashscreen"]["hide"]();
			
		// Trigger onAppBegin for any plugins with a handler
		for (i = 0, len = this.types_by_index.length; i < len; i++)
		{
			t = this.types_by_index[i];
			
			if (t.onAppBegin)
				t.onAppBegin();
		}
		
		// Starting up in minimised/background window: suspend engine
		if (document["hidden"] || document["webkitHidden"] || document["mozHidden"] || document["msHidden"])
		{
			window["cr_setSuspended"](true);		// stop rendering
		}
		else
		{
			// Initial tick
			this.tick(false);
		}
		
		if (this.isDirectCanvas)
			AppMobi["webview"]["execute"]("onGameReady();");
	};
		  
	// Timer tick (process one frame)
	Runtime.prototype.tick = function (background_wake, timestamp, debug_step)
	{
		// Some platforms fire suspend/resume events before the runtime is ready, and resuming
		// calls tick() to kick off the game loop again. If the runtime is not ready just ignore this.
		if (!this.running_layout)
			return;
			
		var nowtime = cr.performance_now();
		var logic_start = nowtime;
		
		// App suspended: stop ticking so code stops executing. Also in background wakes
		// make sure we don't try to kick off any new timers/callbacks.
		// However if the debugger is stepping, allow one step while suspended.
		if (!debug_step && this.isSuspended && !background_wake)
			return;
		
		// Schedule the next frame ASAP, to minimise any latency in the browser frame scheduler,
		// except in background wake mode.
		if (!background_wake)
		{
			if (raf)
				this.raf_id = raf(this.tickFunc);
			else
			{
				// Some mobile browsers without RAF run at sub-optimal framerates with a timeout of
				// 16, presumably because they actually wait for a whole 16 ms until doing another tick.
				// Having a timeout of 1 improves performance by eliminating the wait until the next tick.
				// However, desktop browsers which have no RAF support are optimised for V-syncing with 16ms intervals,
				// otherwise framerates run up in to the hundreds.
				this.timeout_id = setTimeout(this.tickFunc, this.isMobile ? 1 : 16);
			}
		}
		
		// If provided, use the timestamp from requestAnimationFrame since it is probably aligned with
		// the browser v-sync events. Otherwise if not provided (as in a few edge cases like first tick
		// after resume, background wake, or old browsers) then just use the performance_now() time.
		var raf_time = timestamp || nowtime;
		
		/**PREVIEWONLY**/if (!this.resuming_breakpoint) {
		
		// In some circumstances resize events are either not fired at all, or are buggy
		// and fire at the wrong times. To avoid any such issues, we check the window
		// size every tick and if it's changed since we last saw it, fire setSize.
		var fsmode = this.fullscreen_mode;
	
		var isfullscreen = (document["mozFullScreen"] || document["webkitIsFullScreen"] || document["fullScreen"] || !!document["msFullscreenElement"]) && !this.isCordova;
		
		if ((isfullscreen || this.isNodeFullscreen) && this.fullscreen_scaling > 0)
			fsmode = this.fullscreen_scaling;
		
		// Disable this workaround on iOS. Due to what looks like Safari bugs,
		// on iPhone it mis-aligns the canvas when changing orientation and this workaround
		// is in effect, and the iPad browser scrolling goes haywire when using textboxes.
		//if (fsmode > 0 && (!this.isiOS || window.self !== window.top))
		if (fsmode > 0)	// r222: experimentally enabling this workaround for all platforms
		{
			var curwidth = window.innerWidth;
			var curheight = window.innerHeight;
			if (this.lastWindowWidth !== curwidth || this.lastWindowHeight !== curheight)
			{
				this["setSize"](curwidth, curheight);
			}
		}
		
		if (!this.isDomFree)
		{
			// In fullscreen mode, make sure canvas appears aligned center. Note Chrome/nodewebkit does this anyway.
			if (isfullscreen)
			{
				// Save old margin CSS to restore after exiting fullscreen
				if (!this.firstInFullscreen)
				{
					this.fullscreenOldMarginCss = jQuery(this.canvas).css("margin") || "0";
					this.firstInFullscreen = true;
				}
				
				// Force a margin on the canvas to make it appear in the center of the screen
				if (!this.isChrome && !this.isNWjs)
				{
					jQuery(this.canvas).css({
						"margin-left": "" + Math.floor((screen.width - (this.width / this.devicePixelRatio)) / 2) + "px",
						"margin-top": "" + Math.floor((screen.height - (this.height / this.devicePixelRatio)) / 2) + "px"
					});
				}
			}
			// First tick coming out of fullscreen mode: restore previous margins
			else
			{
				if (this.firstInFullscreen)
				{
					if (!this.isChrome && !this.isNWjs)
					{
						jQuery(this.canvas).css("margin", this.fullscreenOldMarginCss);
					}
					
					this.fullscreenOldMarginCss = "";
					this.firstInFullscreen = false;
					
					if (this.fullscreen_mode === 0)
					{
						this["setSize"](Math.round(this.oldWidth / this.devicePixelRatio), Math.round(this.oldHeight / this.devicePixelRatio), true);
					}
				}
				else
				{
					this.oldWidth = this.width;
					this.oldHeight = this.height;
				}
			}
		}
		
		// If a loader layout loading, update the progress
		if (this.isloading)
		{
			var done = this.areAllTexturesAndSoundsLoaded();		// updates this.progress
			this.loadingprogress = this.progress;
			
			if (done)
			{
				this.isloading = false;
				this.progress = 1;
				this.trigger(cr.system_object.prototype.cnds.OnLoadFinished, null);
			}
		}
		
		/**PREVIEWONLY**/}

		// Execute logic
		this.logic(raf_time);

		// Canvas needs updating?  Don't bother redrawing if page is not visible.
		// Force redraw every tick in CocoonJS so screencanvas works properly.
		if ((this.redraw || this.isCocoonJs) && !this.is_WebGL_context_lost && !this.suspendDrawing && !background_wake)
		{
			// Clear draw flag before render, since rendering some animated effects will
			// flag another redraw
			this.redraw = false;
			
			// Render
			/**PREVIEWONLY**/var render_start = cr.performance_now();
			
			if (this.glwrap)
				this.drawGL();
			else
				this.draw();
			
			/**PREVIEWONLY**/this.rendertime += cr.performance_now() - render_start;
			
			// Snapshot the canvas if enabled
			if (this.snapshotCanvas)
			{
				if (this.canvas && this.canvas.toDataURL)
				{
					this.snapshotData = this.canvas.toDataURL(this.snapshotCanvas[0], this.snapshotCanvas[1]);
					
					if (window["cr_onSnapshot"])
						window["cr_onSnapshot"](this.snapshotData);
					
					this.trigger(cr.system_object.prototype.cnds.OnCanvasSnapshot, null);
				}
					
				this.snapshotCanvas = null;
			}
		}

		if (!this.hit_breakpoint)
		{
			this.tickcount++;
			this.execcount++;
			this.framecount++;
		}
		
		this.logictime += cr.performance_now() - logic_start;
	};
	
	/**BEGIN-PREVIEWONLY**/
	function getSubGroups(o, e)
	{
		var i, len, m, g, arr = [];
		for (i = 0, len = e.sub_groups.length; i < len; ++i)
		{
			g = e.sub_groups[i];
			g.profile_last = g.profile_sum;
			g.profile_sum = 0;
			
			m = {
				"name": g.group_name,
				"profile": g.profile_last
			};
			
			getSubGroups(m, g);
			
			arr.push(m);
		}
		
		if (arr.length)
			o["sub_entries"] = arr;
	};
	/**END-PREVIEWONLY**/

	// Process application logic
	Runtime.prototype.logic = function (cur_time)
	{
		var i, leni, j, lenj, k, lenk, type, inst, binst;
		
		/**PREVIEWONLY**/if (!this.resuming_breakpoint) {

		// Test if enough time has passed to update the framerate
		if (cur_time - this.last_fps_time >= 1000)  // every 1 second
		{
			this.last_fps_time += 1000;
			
			// still more than 1 second behind: must have had some kind of hang/pause, just bring up to date
			if (cur_time - this.last_fps_time >= 1000)
				this.last_fps_time = cur_time;
			
			this.fps = this.framecount;
			this.framecount = 0;
			this.cpuutilisation = this.logictime;
			this.logictime = 0;
			
			/**BEGIN-PREVIEWONLY**/
			// Post performance details to debugger
			if (this.isDebug)
			{
				this.rendercpu = this.rendertime;
				this.rendertime = 0;
				this.eventscpu = this.eventstime;
				this.eventstime = 0;
				this.collisioncheck_sec = this.collisioncheck_count;
				this.collisioncheck_count = 0;
				this.polycheck_sec = this.polycheck_count;
				this.polycheck_count = 0;
				this.movedcell_sec = this.movedcell_count;
				this.movedcell_count = 0;
				this.movedrendercell_sec = this.movedrendercell_count;
				this.movedrendercell_count = 0;
				this.physics_cpu = (cr.physics_cpu_time ? cr.physics_cpu_time.sum : 0);
				
				if (cr.physics_cpu_time)
					cr.physics_cpu_time.reset();
				
				// Post off performance details for any active event groups (with nonzero time)
				// when the profiler is active.
				var sheets_perf = [];
				var g, s, o;
				
				if (debuggerIsProfiling())
				{
					for (i = 0, leni = this.eventsheets_by_index.length; i < leni; ++i)
					{
						s = this.eventsheets_by_index[i];
						
						s.profile_last = s.profile_sum;
						s.profile_sum = 0;
						
						if (s.profile_last > 0)
						{
							o = {
								"name": s.name,
								"profile": s.profile_last
							};
							getSubGroups(o, s);
							sheets_perf.push(o);
						}
					}
				}
				
				debuggerPerfStats(this.fps, this.cpuutilisation, this.glwrap ? this.glwrap.estimateVRAM() : -1, this.glwrap ? "webgl" : "canvas2d", this.objectcount, this.rendercpu, this.eventscpu, this.physics_cpu, sheets_perf);
			}
			
			/**END-PREVIEWONLY**/
		}

		// Measure dt
		// Don't measure dt on first tick
		if (this.last_tick_time !== 0)
		{
			// Calculate dt difference in ms
			var ms_diff = cur_time - this.last_tick_time;
			
			// Ensure not negative in case of mismatch between performance_now() and rAF timestamp
			if (ms_diff < 0)
				ms_diff = 0;
			
			this.dt1 = ms_diff / 1000.0; // dt measured in seconds

			// If tab inactive, browser caps timers at 1 Hz.  If this has happened (test by dt being over 0.5),
			// just pause the game.  Also pause if the page is hidden.
			if (this.dt1 > 0.5)
				this.dt1 = 0;
			// Cap at a max dt of 0.1 (min framerate 10fps).
			else if (this.dt1 > 1 / this.minimumFramerate)
				this.dt1 = 1 / this.minimumFramerate;
		}

		this.last_tick_time = cur_time;

        // Set dt to the timescaled dt1 (wall clock delta time)
        this.dt = this.dt1 * this.timescale;

        // Sum the kahan time
        this.kahanTime.add(this.dt);
		this.wallTime.add(this.dt1);
		
		var isfullscreen = (document["mozFullScreen"] || document["webkitIsFullScreen"] || document["fullScreen"] || !!document["msFullscreenElement"] || this.isNodeFullscreen) && !this.isCordova;
		
		// Calculate the project-wide zoom for fullscreen-scale mode
		if (this.fullscreen_mode >= 2 /* scale */ || (isfullscreen && this.fullscreen_scaling > 0))
		{
			var orig_aspect = this.original_width / this.original_height;
			var cur_aspect = this.width / this.height;
			
			var mode = this.fullscreen_mode;
					
			if (isfullscreen && this.fullscreen_scaling > 0)
				mode = this.fullscreen_scaling;
			
			// window width wider: zoom to fit height.
			// note mode 2 (scale inner) inverts this logic and will use window width when width wider.
			if ((mode !== 2 && cur_aspect > orig_aspect) || (mode === 2 && cur_aspect < orig_aspect))
			{
				this.aspect_scale = this.height / this.original_height;
			}
			// window height taller: zoom to fit width
			else
			{
				// zoom to fit width
				this.aspect_scale = this.width / this.original_width;
			}
			
			// Scroll layout to itself so it bounds again
			if (this.running_layout)
			{
				this.running_layout.scrollToX(this.running_layout.scrollX);
				this.running_layout.scrollToY(this.running_layout.scrollY);
			}
		}
		else
			this.aspect_scale = (this.isRetina ? this.devicePixelRatio : 1);

		// Destroy any objects queued for removal
		this.ClearDeathRow();
		
		// Run any events scheduled with the Wait action
		this.isInOnDestroy++;
		
		this.system.runWaits();		// prevent instance list changing
		
		this.isInOnDestroy--;
		
		this.ClearDeathRow();		// allow instance list changing
		
		this.isInOnDestroy++;
		
		// Tick objects-to-pre-tick
        var tickarr = this.objects_to_pretick.valuesRef();

        for (i = 0, leni = tickarr.length; i < leni; i++)
            tickarr[i].pretick();

		// Tick behaviors
		for (i = 0, leni = this.types_by_index.length; i < leni; i++)
		{
			type = this.types_by_index[i];
			
			// don't bother iterating types without behaviors. Types in a family
			// should still be iterated in case the type inherits a family behavior.
			if (type.is_family || (!type.behaviors.length && !type.families.length))
				continue;

			// For each instance in type
			for (j = 0, lenj = type.instances.length; j < lenj; j++)
			{
				inst = type.instances[j];

				// For each behavior-instance in instance
				for (k = 0, lenk = inst.behavior_insts.length; k < lenk; k++)
				{
					inst.behavior_insts[k].tick();
				}
			}
		}
		
		// Call posttick on behaviors
		for (i = 0, leni = this.types_by_index.length; i < leni; i++)
		{
			type = this.types_by_index[i];
			
			if (type.is_family || (!type.behaviors.length && !type.families.length))
				continue;	// type doesn't have any behaviors

			// For each instance in type
			for (j = 0, lenj = type.instances.length; j < lenj; j++)
			{
				inst = type.instances[j];

				// For each behavior-instance in instance
				for (k = 0, lenk = inst.behavior_insts.length; k < lenk; k++)
				{
					binst = inst.behavior_insts[k];
					
					if (binst.posttick)
						binst.posttick();
				}
			}
		}
		
		// Tick objects-to-tick
        tickarr = this.objects_to_tick.valuesRef();

        for (i = 0, leni = tickarr.length; i < leni; i++)
            tickarr[i].tick();
			
		this.isInOnDestroy--;		// end preventing instance lists from being changed
		
		this.handleSaveLoad();		// save/load now if queued
			
		// Switch layout if one set.  Keep switching in case 'on start of layout' sets another layout,
		// but to prevent infinite loops, do this a maximum of ten times.
		i = 0;
		
		while (this.changelayout && i++ < 10)
		{
			this.doChangeLayout(this.changelayout);
		}

        // Reset all 'hasRun' flags on all event sheets to prevent event sheet cyclic inclusions
        for (i = 0, leni = this.eventsheets_by_index.length; i < leni; i++)
            this.eventsheets_by_index[i].hasRun = false;

		// If the running layout has an event sheet, run it
		/**PREVIEWONLY**/var events_start = cr.performance_now();
		
		/**PREVIEWONLY**/}		/* end of: if (!this.resuming_breakpoint) */
		
		if (this.running_layout.event_sheet)
			this.running_layout.event_sheet.run();
		
		/**PREVIEWONLY**/if (this.hit_breakpoint) return;
		/**PREVIEWONLY**/this.eventstime += cr.performance_now() - events_start;
			
		// Reset the registered collisions
		cr.clearArray(this.registered_collisions);
			
		// Reset the first tick this layout flag
		this.layout_first_tick = false;
		
		this.isInOnDestroy++;		// prevent instance lists from being changed
		
		// Post-event ticking (tick2)
		for (i = 0, leni = this.types_by_index.length; i < leni; i++)
		{
			type = this.types_by_index[i];
			
			if (type.is_family || (!type.behaviors.length && !type.families.length))
				continue;	// type doesn't have any behaviors

			// For each instance in type
			for (j = 0, lenj = type.instances.length; j < lenj; j++)
			{
				var inst = type.instances[j];

				// For each behavior-instance in instance
				for (k = 0, lenk = inst.behavior_insts.length; k < lenk; k++)
				{
					binst = inst.behavior_insts[k];
					
					if (binst.tick2)
						binst.tick2();
				}
			}
		}
		
		// Tick objects-to-tick2
        tickarr = this.objects_to_tick2.valuesRef();

        for (i = 0, leni = tickarr.length; i < leni; i++)
            tickarr[i].tick2();
			
		this.isInOnDestroy--;		// end preventing instance lists from being changed
	};
	
	Runtime.prototype.onWindowBlur = function ()
	{
		var i, leni, j, lenj, k, lenk, type, inst, binst;
		
		for (i = 0, leni = this.types_by_index.length; i < leni; i++)
		{
			type = this.types_by_index[i];
			
			if (type.is_family)
				continue;

			// For each instance in type
			for (j = 0, lenj = type.instances.length; j < lenj; j++)
			{
				inst = type.instances[j];
				
				if (inst.onWindowBlur)
					inst.onWindowBlur();

				if (!inst.behavior_insts)
					continue;	// single-globals don't have behavior_insts
				
				// For each behavior-instance in instance
				for (k = 0, lenk = inst.behavior_insts.length; k < lenk; k++)
				{
					binst = inst.behavior_insts[k];
					
					if (binst.onWindowBlur)
						binst.onWindowBlur();
				}
			}
		}
	};
	
	Runtime.prototype.doChangeLayout = function (changeToLayout)
	{
		var prev_layout = this.running_layout;
		this.running_layout.stopRunning();
		
		var i, len, j, lenj, k, lenk, type, inst, binst;
		
		// WebGL renderer: clean up all textures for all types not on the next layout
		if (this.glwrap)
		{
			for (i = 0, len = this.types_by_index.length; i < len; i++)
			{
				type = this.types_by_index[i];
				
				if (type.is_family)
					continue;
				
				// This type not used on next layout
				if (type.unloadTextures && (!type.global || type.instances.length === 0) && changeToLayout.initial_types.indexOf(type) === -1)
				{
					type.unloadTextures();
				}
			}
		}
		
		// If restarting the same layout, cancel all pending waits
		if (prev_layout == changeToLayout)
			cr.clearArray(this.system.waits);
		
		// Reset the registered collisions
		cr.clearArray(this.registered_collisions);
		
		// trigger 'onBeforeLayoutChange' for all global objects
		this.runLayoutChangeMethods(true);
		
		changeToLayout.startRunning();
		
		// trigger 'onLayoutChange' for all global objects
		this.runLayoutChangeMethods(false);
		
		this.redraw = true;
		this.layout_first_tick = true;
		
		// Destroy any objects queued for removal on 'Start of layout'
		this.ClearDeathRow();
	};
	
	Runtime.prototype.runLayoutChangeMethods = function (isBeforeChange)
	{
		var i, len, beh, type, j, lenj, inst, k, lenk, binst;
		
		// Call every Behavior plugin first (pathfinding uses this to update the map)
		for (i = 0, len = this.behaviors.length; i < len; i++)
		{
			beh = this.behaviors[i];
			
			if (isBeforeChange)
			{
				if (beh.onBeforeLayoutChange)
					beh.onBeforeLayoutChange();
			}
			else
			{
				if (beh.onLayoutChange)
					beh.onLayoutChange();
			}
		}
		
		for (i = 0, len = this.types_by_index.length; i < len; i++)
		{
			type = this.types_by_index[i];
			
			if (!type.global && !type.plugin.singleglobal)
				continue;

			// For each instance in type
			for (j = 0, lenj = type.instances.length; j < lenj; j++)
			{
				inst = type.instances[j];

				if (isBeforeChange)
				{
					if (inst.onBeforeLayoutChange)
						inst.onBeforeLayoutChange();
				}
				else
				{
					if (inst.onLayoutChange)
						inst.onLayoutChange();
				}
				
				if (inst.behavior_insts)
				{
					for (k = 0, lenk = inst.behavior_insts.length; k < lenk; k++)
					{
						binst = inst.behavior_insts[k];
						
						if (isBeforeChange)
						{
							if (binst.onBeforeLayoutChange)
								binst.onBeforeLayoutChange();
						}
						else
						{
							if (binst.onLayoutChange)
								binst.onLayoutChange();
						}
					}
				}
			}
		}
	};

	Runtime.prototype.pretickMe = function (inst)
    {
        this.objects_to_pretick.add(inst);
    };
	
	Runtime.prototype.unpretickMe = function (inst)
	{
		this.objects_to_pretick.remove(inst);
	};
	
    Runtime.prototype.tickMe = function (inst)
    {
        this.objects_to_tick.add(inst);
    };
	
	Runtime.prototype.untickMe = function (inst)
	{
		this.objects_to_tick.remove(inst);
	};
	
	Runtime.prototype.tick2Me = function (inst)
    {
        this.objects_to_tick2.add(inst);
    };
	
	Runtime.prototype.untick2Me = function (inst)
	{
		this.objects_to_tick2.remove(inst);
	};

    // Get dt for a given instance (in case it has its own time scale set)
    Runtime.prototype.getDt = function (inst)
    {
        // -1 indicates no object time scale set; use game timescale
        if (!inst || inst.my_timescale === -1.0)
            return this.dt;

        // Otherwise return wall-clock dt scaled by instance timescale
        return this.dt1 * inst.my_timescale;
    };

	// Render to canvas
	Runtime.prototype.draw = function ()
	{
		// Draw the running layout
		this.running_layout.draw(this.ctx);
		
		/**PREVIEWONLY**/debuggerShowInspectInstance();
		
		// DirectCanvas needs a present() call
		if (this.isDirectCanvas)
			this.ctx["present"]();
	};
	
	Runtime.prototype.drawGL = function ()
	{
		if (this.enableFrontToBack)
		{
			this.earlyz_index = 1;		// start from front, 1-based to avoid exactly equalling near plane Z value
			this.running_layout.drawGL_earlyZPass(this.glwrap);
		}
		
		this.running_layout.drawGL(this.glwrap);
		
		/**PREVIEWONLY**/debuggerShowInspectInstance();
		
		this.glwrap.present();
	};

	Runtime.prototype.addDestroyCallback = function (f)
	{
		if (f)
			this.destroycallbacks.push(f);
	};
	
	Runtime.prototype.removeDestroyCallback = function (f)
	{
		cr.arrayFindRemove(this.destroycallbacks, f);
	};
	
	Runtime.prototype.getObjectByUID = function (uid_)
	{
		assert2(!this.isLoadingState, "Do not call getObjectByUID in loadFromJSON: wait until afterLoad() to look up");
		var uidstr = uid_.toString();
		
		if (this.objectsByUid.hasOwnProperty(uidstr))
			return this.objectsByUid[uidstr];
		else
			return null;
	};
	
	var objectset_cache = [];
	
	function alloc_objectset()
	{
		if (objectset_cache.length)
			return objectset_cache.pop();
		else
			return new cr.ObjectSet();
	};
	
	function free_objectset(s)
	{
		s.clear();
		objectset_cache.push(s);
	};

	Runtime.prototype.DestroyInstance = function (inst)
	{
		var i, len;
		var type = inst.type;
		var typename = type.name;
		var has_typename = this.deathRow.hasOwnProperty(typename);
		var obj_set = null;
		
		if (has_typename)
		{
			obj_set = this.deathRow[typename];
			
			if (obj_set.contains(inst))
				return;		// already had DestroyInstance called
		}
		else
		{
			// If no objectset record for this type name yet, add one
			obj_set = alloc_objectset();
			this.deathRow[typename] = obj_set;
		}
		
		// Add to death row to destroy later
		obj_set.add(inst);
		this.hasPendingInstances = true;
		
		// Also destroy all siblings if in container
		if (inst.is_contained)
		{
			for (i = 0, len = inst.siblings.length; i < len; i++)
			{
				this.DestroyInstance(inst.siblings[i]);
			}
		}
		
		// Is in the middle of ClearDeathRow: update values cache directly so this instance is also iterated
		if (this.isInClearDeathRow)
			obj_set.values_cache.push(inst);
		
		// Don't fire "On destroy" when ending a layout. This makes it tricky to know what to do with objects
		// that are created in "On destroy" events, and generally is confusing to users.
		if (!this.isEndingLayout)
		{
			this.isInOnDestroy++;		// support recursion
			this.trigger(Object.getPrototypeOf(inst.type.plugin).cnds.OnDestroyed, inst);
			this.isInOnDestroy--;
		}
	};

	Runtime.prototype.ClearDeathRow = function ()
	{
		if (!this.hasPendingInstances)
			return;
		
		var inst, type, instances;
		var i, j, leni, lenj, obj_set;
		this.isInClearDeathRow = true;
		
		// Flush creation row
		for (i = 0, leni = this.createRow.length; i < leni; ++i)
		{
			inst = this.createRow[i];
			type = inst.type;
			type.instances.push(inst);
			
			// Add to the type's family's instances
			for (j = 0, lenj = type.families.length; j < lenj; ++j)
			{
				type.families[j].instances.push(inst);
				type.families[j].stale_iids = true;
			}
		}
		
		cr.clearArray(this.createRow);
		
		this.IterateDeathRow();		// moved to separate function so for-in performance doesn't hobble entire function

		cr.wipe(this.deathRow);		// all objectsets have already been recycled
		this.isInClearDeathRow = false;
		this.hasPendingInstances = false;
	};
	
	Runtime.prototype.IterateDeathRow = function ()
	{
		// V8 sometimes complains "Not optimized: ForInStatement is not fast case".
		// This punishes the entire containing function, so we have this code in
		// its own absolutely minimal function.
		for (var p in this.deathRow)
		{
			if (this.deathRow.hasOwnProperty(p))
			{
				this.ClearDeathRowForType(this.deathRow[p]);
			}
		}
	};
	
	Runtime.prototype.ClearDeathRowForType = function (obj_set)
	{
		var arr = obj_set.valuesRef();			// get array of items from set
		assert2(arr.length, "empty object list to destroy");
		
		var type = arr[0].type;
		
		assert2(type, "missing type when destroying objects");
		assert2(obj_set, "missing object set");
		
		var i, len, j, lenj, w, f, layer_instances, inst;
		
		// Remove all destroyed instances from the type instance list
		cr.arrayRemoveAllFromObjectSet(type.instances, obj_set);
		
		// Make sure IIDs reindex
		type.stale_iids = true;
		
		// Type is now empty: reset parallax flag so effect is not permanent
		if (type.instances.length === 0)
			type.any_instance_parallaxed = false;
		
		// Remove from the type's families
		for (i = 0, len = type.families.length; i < len; ++i)
		{
			f = type.families[i];
			cr.arrayRemoveAllFromObjectSet(f.instances, obj_set);
			f.stale_iids = true;
		}
		
		// Remove from any events scheduled with the wait action
		for (i = 0, len = this.system.waits.length; i < len; ++i)
		{
			w = this.system.waits[i];
			
			if (w.sols.hasOwnProperty(type.index))
				cr.arrayRemoveAllFromObjectSet(w.sols[type.index].insts, obj_set);
			
			// Also remove from type's families with wait records
			if (!type.is_family)
			{
				for (j = 0, lenj = type.families.length; j < lenj; ++j)
				{
					f = type.families[j];
				
					if (w.sols.hasOwnProperty(f.index))
						cr.arrayRemoveAllFromObjectSet(w.sols[f.index].insts, obj_set);
				}
			}
		}
		
		// Speculative optimisation: the instances to destroy for this type can belong to any layer, so
		// every instance must find itself in the layer instance list and remove itself. However in some
		// cases all the objects will be on the same layer. When destroying a large number of instances
		// on a layer with many instances, the continual find-remove creates n^2 (in)efficient removals in
		// a large array. However if we assume they all belong to the same layer and pre-emptively do a
		// faster remove-all using the full instance list, then we optimise for this case. It doesn't matter
		// if they are found or not: if found now then the instance will not remove itself later (saving the
		// per-instance removal cost), or if not found now then the instance will remove itself later (invoking
		// the per-instance removal cost, but only when objects are on different layers).
		var first_layer = arr[0].layer;
		
		if (first_layer)
		{
			// Remove each instance from the render grid in render cells mode
			if (first_layer.useRenderCells)
			{
				layer_instances = first_layer.instances;
				
				for (i = 0, len = layer_instances.length; i < len; ++i)
				{
					inst = layer_instances[i];
					
					if (!obj_set.contains(inst))
						continue;		// not destroying this instance
					
					// Remove from render grid and set rendercells to invalid initial state to indicate not in grid
					inst.update_bbox();
					first_layer.render_grid.update(inst, inst.rendercells, null);
					inst.rendercells.set(0, 0, -1, -1);
				}
			}
			
			cr.arrayRemoveAllFromObjectSet(first_layer.instances, obj_set);
			first_layer.setZIndicesStaleFrom(0);
		}
		
		// Per-instance removal tasks		
		for (i = 0; i < arr.length; ++i)		// check array length every time in case it changes
		{
			this.ClearDeathRowForSingleInstance(arr[i], type);
		}
		
		// recycle the object set - note we wipe the whole deathRow object later
		free_objectset(obj_set);
				
		// make sure if anything is destroyed a redraw happens
		this.redraw = true;
	};
	
	Runtime.prototype.ClearDeathRowForSingleInstance = function (inst, type)
	{
		var i, len, binst;
		
		// Call all the 'instance destroyed' callbacks
		for (i = 0, len = this.destroycallbacks.length; i < len; ++i)
			this.destroycallbacks[i](inst);
		
		// Erase from collision cells object is added to
		if (inst.collcells)
		{
			// no new range provided - will remove only
			type.collision_grid.update(inst, inst.collcells, null);
		}

		// Delete from layer instances if on a layer. Note ClearDeathRowForType
		// may or may not have pre-emtively removed it; see the comments in that function.
		var layer = inst.layer;
		
		if (layer)
		{
			layer.removeFromInstanceList(inst, true);		// remove from both instance list and render grid
		}
		
		// Remove from all behavior-plugin's instances
		if (inst.behavior_insts)
		{
			for (i = 0, len = inst.behavior_insts.length; i < len; ++i)
			{
				binst = inst.behavior_insts[i];
				
				if (binst.onDestroy)
					binst.onDestroy();
					
				binst.behavior.my_instances.remove(inst);
			}
		}

		// Remove from objects-to-tick
		this.objects_to_pretick.remove(inst);
		this.objects_to_tick.remove(inst);
		this.objects_to_tick2.remove(inst);

		if (inst.onDestroy)
			inst.onDestroy();
			
		// Remove from the global UID map
		if (this.objectsByUid.hasOwnProperty(inst.uid.toString()))
			delete this.objectsByUid[inst.uid.toString()];
			
		this.objectcount--;
		
		// Cache up to 100 dead instances of this type to recycle for next create
		if (type.deadCache.length < 100)
			type.deadCache.push(inst);
		
		// Notify debugger of destroyed instance
		/**PREVIEWONLY**/if (this.isDebug) debuggerInstanceDestroyed(inst);
	};

	Runtime.prototype.createInstance = function (type, layer, sx, sy)
	{
		// If passed a family, pick a random type in the family and create that instead
		if (type.is_family)
		{
			var i = cr.floor(Math.random() * type.members.length);
			return this.createInstance(type.members[i], layer, sx, sy);
		}
		
		if (!type.default_instance)
		{
			/**PREVIEWONLY**/ alert("Cannot create an instance of the object type '" + type.name + "': there are no instances of this object anywhere in the project.  Construct 2 needs at least one instance to know which properties to assign to the object.  To resolve this, add at least one instance of the object to the project, on an unused layout if necessary.");
			return null;
		}
		
		return this.createInstanceFromInit(type.default_instance, layer, false, sx, sy, false);
	};
	
	var all_behaviors = [];

	Runtime.prototype.createInstanceFromInit = function (initial_inst, layer, is_startup_instance, sx, sy, skip_siblings)
	{
		var i, len, j, lenj, p, effect_fallback, x, y;
		
		if (!initial_inst)
			return null;
		
		var type = this.types_by_index[initial_inst[1]];
		assert2(type, "Cannot find object type '" + initial_inst[1] + "'");
		assert2(!type.is_family, "Cannot directly create an instance from a family type");
		
		var is_world = type.plugin.is_world;
		assert2(!is_world || layer, "Creating world instance without specifying layer");
		
		// Fail if on a loader layout and this type is not loaded yet
		if (this.isloading && is_world && !type.isOnLoaderLayout)
			return null;
			
		// Fail to create if no WebGL renderer available and effect fallback is 'destroy'
		if (is_world && !this.glwrap && initial_inst[0][11] === 11)
			return null;
		
		// Using "System - create object" non-world objects can be created, but they get a valid layer
		// passed from the action.  The layer should be cleared to null otherwise a non-world object
		// gets pushed on to the layer.
		// On the other hand we also want to preserve the originally passed layer to pass along again
		// when creating siblings for a container.
		var original_layer = layer;
		
		if (!is_world)
			layer = null;
		
		// Either recycle a previously destroyed instance if any, else create a new object.
		var inst;
		
		if (type.deadCache.length)
		{
			inst = type.deadCache.pop();
			inst.recycled = true;
			
			// re-run ctor on recycled inst
			type.plugin.Instance.call(inst, type);
		}
		else
		{
			inst = new type.plugin.Instance(type);
			inst.recycled = false;
		}
		
		// Assign unique id: startup instances use the ID from the project model,
		// otherwise assign incrementing UIDs.
		// Note global objects on global layers may try to use the same UIDs; make sure the UID is
		// not already in use before using the saved UID.
		if (is_startup_instance && !skip_siblings && !this.objectsByUid.hasOwnProperty(initial_inst[2].toString()))
			inst.uid = initial_inst[2];
		else
			inst.uid = this.next_uid++;
		
		this.objectsByUid[inst.uid.toString()] = inst;
		
		inst.puid = this.next_puid++;
		
		// Assign instance id in advance. Must also check create row to get correct IIDs for
		// batch created instances.
		inst.iid = type.instances.length;
		
		for (i = 0, len = this.createRow.length; i < len; ++i)
		{
			if (this.createRow[i].type === type)
				inst.iid++;
		}
		
		inst.get_iid = cr.inst_get_iid;
		
		inst.toString = cr.inst_toString;

		// Slice the instance variables array to create a copy, rather than editing the initial instance variables,
		// or if the instance was recycled just copy over the initial values.
		var initial_vars = initial_inst[3];
		
		if (inst.recycled)
		{		
			// clear the 'extra' object
			cr.wipe(inst.extra);
		}
		else
		{			
			inst.extra = {};
			
			// In preview mode, store the names of the instance variables for the debugger
			if (typeof cr_is_preview !== "undefined")
			{
				inst.instance_var_names = [];
				inst.instance_var_names.length = initial_vars.length;
				
				for (i = 0, len = initial_vars.length; i < len; i++)
					inst.instance_var_names[i] = initial_vars[i][1];
			}
			
			inst.instance_vars = [];
			inst.instance_vars.length = initial_vars.length;
		}
		
		for (i = 0, len = initial_vars.length; i < len; i++)
			inst.instance_vars[i] = initial_vars[i][0];

		if (is_world)
		{
			// Copy world info from the data model
			var wm = initial_inst[0];
			assert2(wm, "World instance info missing");
			
			inst.x = cr.is_undefined(sx) ? wm[0] : sx;
			inst.y = cr.is_undefined(sy) ? wm[1] : sy;
			inst.z = wm[2];
			inst.width = wm[3];
			inst.height = wm[4];
			inst.depth = wm[5];
			inst.angle = wm[6];
			inst.opacity = wm[7];
			inst.hotspotX = wm[8];
			inst.hotspotY = wm[9];
			inst.blend_mode = wm[10];
			
			// Set the blend mode if fallback requires
			effect_fallback = wm[11];
			
			if (!this.glwrap && type.effect_types.length)	// no WebGL renderer and shaders used
				inst.blend_mode = effect_fallback;			// use fallback blend mode - destroy mode was handled above
			
			// Set the blend mode variables
			inst.compositeOp = cr.effectToCompositeOp(inst.blend_mode);
			
			if (this.gl)
				cr.setGLBlend(inst, inst.blend_mode, this.gl);
			
			// Runtime members
			if (inst.recycled)
			{
				for (i = 0, len = wm[12].length; i < len; i++)
				{
					for (j = 0, lenj = wm[12][i].length; j < lenj; j++)
						inst.effect_params[i][j] = wm[12][i][j];
				}
				
				inst.bbox.set(0, 0, 0, 0);
				inst.collcells.set(0, 0, -1, -1);
				inst.rendercells.set(0, 0, -1, -1);
				inst.bquad.set_from_rect(inst.bbox);
				cr.clearArray(inst.bbox_changed_callbacks);
			}
			else
			{
				inst.effect_params = wm[12].slice(0);
				
				for (i = 0, len = inst.effect_params.length; i < len; i++)
					inst.effect_params[i] = wm[12][i].slice(0);
				
				inst.active_effect_types = [];
				inst.active_effect_flags = [];
				inst.active_effect_flags.length = type.effect_types.length;
				
				inst.bbox = new cr.rect(0, 0, 0, 0);
				inst.collcells = new cr.rect(0, 0, -1, -1);
				inst.rendercells = new cr.rect(0, 0, -1, -1);
				inst.bquad = new cr.quad();
				inst.bbox_changed_callbacks = [];
				inst.set_bbox_changed = cr.set_bbox_changed;
				inst.add_bbox_changed_callback = cr.add_bbox_changed_callback;
				inst.contains_pt = cr.inst_contains_pt;
				inst.update_bbox = cr.update_bbox;
				inst.update_render_cell = cr.update_render_cell;
				inst.update_collision_cell = cr.update_collision_cell;
				inst.get_zindex = cr.inst_get_zindex;
			}
			
			inst.tilemap_exists = false;
			inst.tilemap_width = 0;
			inst.tilemap_height = 0;
			inst.tilemap_data = null;
			
			if (wm.length === 14)
			{
				inst.tilemap_exists = true;
				inst.tilemap_width = wm[13][0];
				inst.tilemap_height = wm[13][1];
				inst.tilemap_data = wm[13][2];
			}
			
			// Reset all effects to active
			for (i = 0, len = type.effect_types.length; i < len; i++)
				inst.active_effect_flags[i] = true;
			
			inst.shaders_preserve_opaqueness = true;
			inst.updateActiveEffects = cr.inst_updateActiveEffects;
			inst.updateActiveEffects();
			
			inst.uses_shaders = !!inst.active_effect_types.length;
			inst.bbox_changed = true;
			inst.cell_changed = true;
			type.any_cell_changed = true;
			inst.visible = true;
			
            // Local timescale of -1 means use game timescale
            inst.my_timescale = -1.0;
			inst.layer = layer;
			inst.zindex = layer.instances.length;	// will be placed at top of current layer
			inst.earlyz_index = 0;
			
			// Note: don't overwrite Sprite collision poly created in ctor rather than onCreate
			if (typeof inst.collision_poly === "undefined")
				inst.collision_poly = null;
			
			inst.collisionsEnabled = true;
			
			this.redraw = true;
		}
		
		var initial_props, binst;
		
		// Determine the list of all behavior types including those inherited from families		
		cr.clearArray(all_behaviors);
		
		for (i = 0, len = type.families.length; i < len; i++)
		{
			all_behaviors.push.apply(all_behaviors, type.families[i].behaviors);
		}
		
		all_behaviors.push.apply(all_behaviors, type.behaviors);

		// Create behavior instances or recycle old ones
		if (inst.recycled)
		{
			for (i = 0, len = all_behaviors.length; i < len; i++)
			{
				var btype = all_behaviors[i];
				binst = inst.behavior_insts[i];
				binst.recycled = true;
				
				// re-run ctor on behavior inst
				btype.behavior.Instance.call(binst, btype, inst);
				
				// Copy in behavior instance properties
				initial_props = initial_inst[4][i];
				
				for (j = 0, lenj = initial_props.length; j < lenj; j++)
					binst.properties[j] = initial_props[j];

				binst.onCreate();
				
				// Add object instance to behavior-plugin's instances
				btype.behavior.my_instances.add(inst);
			}
		}
		else
		{
			inst.behavior_insts = [];

			for (i = 0, len = all_behaviors.length; i < len; i++)
			{
				var btype = all_behaviors[i];
				var binst = new btype.behavior.Instance(btype, inst);
				binst.recycled = false;
				
				// Copy in behavior instance properties
				binst.properties = initial_inst[4][i].slice(0);

				binst.onCreate();
				cr.seal(binst);
				
				inst.behavior_insts.push(binst);
				
				// Add object instance to behavior-plugin's instances
				btype.behavior.my_instances.add(inst);
			}
		}
		
		// Copy in properties
		initial_props = initial_inst[5];
		
		if (inst.recycled)
		{
			for (i = 0, len = initial_props.length; i < len; i++)
				inst.properties[i] = initial_props[i];
		}
		else
			inst.properties = initial_props.slice(0);

		// Don't add to type's instances yet - can break events looping over the instances.
		// Instead add it to creation row to be fully created at next top-level event.
		this.createRow.push(inst);
		this.hasPendingInstances = true;

		// Add to the layer instances
		if (layer)
		{
			assert2(is_world, "Adding non-world instance to layer");
			layer.appendToInstanceList(inst, true);
			
			// If this layer is parallaxed, mark type as having parallaxed instances
			if (layer.parallaxX !== 1 || layer.parallaxY !== 1)
				type.any_instance_parallaxed = true;
		}
			
		this.objectcount++;
		
		// Create all siblings if in a container
		if (type.is_contained)
		{
			inst.is_contained = true;
			
			if (inst.recycled)
				cr.clearArray(inst.siblings);
			else
				inst.siblings = [];			// note: should not include self in siblings
			
			if (!is_startup_instance && !skip_siblings)	// layout links initial instances
			{
				for (i = 0, len = type.container.length; i < len; i++)
				{
					if (type.container[i] === type)
						continue;
					
					if (!type.container[i].default_instance)
					{
						/**PREVIEWONLY**/ alert("Cannot create an instance of the object type '" + type.container[i].name + "': there are no instances of this object anywhere in the project.  Construct 2 needs at least one instance to know which properties to assign to the object.  To resolve this, add at least one instance of the object to the project, on an unused layout if necessary.");
						return null;
					}

					// pass skip_siblings as true to prevent recursing infinitely
					inst.siblings.push(this.createInstanceFromInit(type.container[i].default_instance, original_layer, false, is_world ? inst.x : sx, is_world ? inst.y : sy, true));
				}
				
				// Make sure all the created siblings also have the right sibling arrays
				for (i = 0, len = inst.siblings.length; i < len; i++)
				{
					inst.siblings[i].siblings.push(inst);
					
					for (j = 0; j < len; j++)
					{
						if (i !== j)
							inst.siblings[i].siblings.push(inst.siblings[j]);
					}
				}
			}
		}
		else
		{
			inst.is_contained = false;
			inst.siblings = null;
		}
		
		inst.onCreate();
		
		if (!inst.recycled)
			cr.seal(inst);
			
		// postCreate all behaviors
		for (i = 0, len = inst.behavior_insts.length; i < len; i++)
		{
			if (inst.behavior_insts[i].postCreate)
				inst.behavior_insts[i].postCreate();
		}
		
		// Notify debugger of a new instance
		/**PREVIEWONLY**/if (this.isDebug) debuggerInstanceCreated(inst);

		return inst;
	};

	Runtime.prototype.getLayerByName = function (layer_name)
	{
		var i, len;
		for (i = 0, len = this.running_layout.layers.length; i < len; i++)
		{
			var layer = this.running_layout.layers[i];

			if (cr.equals_nocase(layer.name, layer_name))
				return layer;
		}
		
		return null;
	};

	Runtime.prototype.getLayerByNumber = function (index)
	{
		index = cr.floor(index);
		
		if (index < 0)
			index = 0;
		if (index >= this.running_layout.layers.length)
			index = this.running_layout.layers.length - 1;

		return this.running_layout.layers[index];
	};
	
	Runtime.prototype.getLayer = function (l)
	{
		if (cr.is_number(l))
			return this.getLayerByNumber(l);
		else
			return this.getLayerByName(l.toString());
	};
	
	Runtime.prototype.clearSol = function (solModifiers)
	{
		// Iterate types in list  and reset their SOLs to select all
		var i, len;
		for (i = 0, len = solModifiers.length; i < len; i++)
		{
			solModifiers[i].getCurrentSol().select_all = true;
		}
	};

	Runtime.prototype.pushCleanSol = function (solModifiers)
	{
		// Iterate types in list and push a new, empty SOL
		var i, len;
		for (i = 0, len = solModifiers.length; i < len; i++)
		{
			solModifiers[i].pushCleanSol();
		}
	};

	Runtime.prototype.pushCopySol = function (solModifiers)
	{
		// Iterate types in list and push a cloned SOL
		var i, len;
		for (i = 0, len = solModifiers.length; i < len; i++)
		{
			solModifiers[i].pushCopySol();
		}
	};

	Runtime.prototype.popSol = function (solModifiers)
	{
		// Iterate types in list and pop back a SOL
		var i, len;
		for (i = 0, len = solModifiers.length; i < len; i++)
		{
			solModifiers[i].popSol();
		}
	};
	
	Runtime.prototype.updateAllCells = function (type)
	{
		if (!type.any_cell_changed)
			return;		// all instances must already be up-to-date
		
		var i, len, instances = type.instances;
		for (i = 0, len = instances.length; i < len; ++i)
		{
			instances[i].update_collision_cell();
		}
		
		// include anything on createrow
		var createRow = this.createRow;
		
		for (i = 0, len = createRow.length; i < len; ++i)
		{
			if (createRow[i].type === type)
				createRow[i].update_collision_cell();
		}
		
		type.any_cell_changed = false;
	};
	
	// Collect candidates for grid cell collisions
	Runtime.prototype.getCollisionCandidates = function (layer, rtype, bbox, candidates)
	{
		var i, len, t;
		var is_parallaxed = (layer ? (layer.parallaxX !== 1 || layer.parallaxY !== 1) : false);
		
		// Need to update bounding boxes first so all objects get updated to their correct buckets
		if (rtype.is_family)
		{
			for (i = 0, len = rtype.members.length; i < len; ++i)
			{
				t = rtype.members[i];
				
				if (is_parallaxed || t.any_instance_parallaxed)
				{
					cr.appendArray(candidates, t.instances);
				}
				else
				{
					this.updateAllCells(t);
					t.collision_grid.queryRange(bbox, candidates);
				}
			}
		}
		else
		{
			// When parallaxing is used, the collision grid cells no longer line up.
			// So we have no choice but to disable the optimisation and return all instances.
			if (is_parallaxed || rtype.any_instance_parallaxed)
			{
				cr.appendArray(candidates, rtype.instances);
			}
			else
			{
				this.updateAllCells(rtype);
				rtype.collision_grid.queryRange(bbox, candidates);
			}
		}
	};
	
	Runtime.prototype.getTypesCollisionCandidates = function (layer, types, bbox, candidates)
	{
		var i, len;
		
		for (i = 0, len = types.length; i < len; ++i)
		{
			this.getCollisionCandidates(layer, types[i], bbox, candidates);
		}
	};
	
	Runtime.prototype.getSolidCollisionCandidates = function (layer, bbox, candidates)
	{
		var solid = this.getSolidBehavior();

		if (!solid)
			return null;
		
		this.getTypesCollisionCandidates(layer, solid.my_types, bbox, candidates);
	};
	
	Runtime.prototype.getJumpthruCollisionCandidates = function (layer, bbox, candidates)
	{
		var jumpthru = this.getJumpthruBehavior();

		if (!jumpthru)
			return null;
		
		this.getTypesCollisionCandidates(layer, jumpthru.my_types, bbox, candidates);
	};
	
	// Test point overlap and pick relevant objects, with pt in canvas coords
	Runtime.prototype.testAndSelectCanvasPointOverlap = function (type, ptx, pty, inverted)
	{
		// Get the current SOL
		var sol = type.getCurrentSol();
		var i, j, inst, len;
		var orblock = this.getCurrentEventStack().current_event.orblock;
		
		// Point translated from canvas to given layer
		var lx, ly, arr;

		// All selected - filter in to the SOL instances
		if (sol.select_all)
		{
			if (!inverted)
			{
				sol.select_all = false;
				cr.clearArray(sol.instances);   // clear contents
			}

			for (i = 0, len = type.instances.length; i < len; i++)
			{
				inst = type.instances[i];
				inst.update_bbox();
				
				// Transform point from canvas to instance's layer
				lx = inst.layer.canvasToLayer(ptx, pty, true);
				ly = inst.layer.canvasToLayer(ptx, pty, false);
				
				if (inst.contains_pt(lx, ly))
				{
					// found one overlapping, negated test is now false
					if (inverted)
						return false;
					// otherwise pick as usual
					else
						sol.instances.push(inst);
				}
				else if (orblock)
					sol.else_instances.push(inst);
			}
		}
		else
		{
			// Otherwise filter the existing SOL
			j = 0;
			arr = (orblock ? sol.else_instances : sol.instances);
			
			for (i = 0, len = arr.length; i < len; i++)
			{
				inst = arr[i];
				inst.update_bbox();
				
				// Transform point from canvas to instance's layer
				lx = inst.layer.canvasToLayer(ptx, pty, true);
				ly = inst.layer.canvasToLayer(ptx, pty, false);
				
				if (inst.contains_pt(lx, ly))
				{
					// found one overlapping, negated test is now false
					if (inverted)
						return false;
					// iterating else_instances: push back to main instance list
					else if (orblock)
						sol.instances.push(inst);
					// otherwise pick as usual
					else
					{
						sol.instances[j] = sol.instances[i];
						j++;
					}
				}
			}

			// Truncate to those filtered
			if (!inverted)
				arr.length = j;
		}
		
		type.applySolToContainer();

		if (inverted)
			return true;		// did not find anything overlapping
		else
			return sol.hasObjects();
	};

	// Test if instances 'a' and 'b' overlap each other
	Runtime.prototype.testOverlap = function (a, b)
	{
		// Instances don't overlap themselves.  Also return false early if either object has collisions disabled.
		if (!a || !b || a === b || !a.collisionsEnabled || !b.collisionsEnabled)
			return false;

		/**PREVIEWONLY**/this.collisioncheck_count++;
		a.update_bbox();
		b.update_bbox();
		
		// Check if testing collision with objects on different layers with different
		// positioning settings (e.g. parallax, scale, etc).  If so, we need to translate
		// both object's polys to screen co-ordinates before collision checking.
		var layera = a.layer;
		var layerb = b.layer;
		var different_layers = (layera !== layerb && (layera.parallaxX !== layerb.parallaxX || layerb.parallaxY !== layerb.parallaxY || layera.scale !== layerb.scale || layera.angle !== layerb.angle || layera.zoomRate !== layerb.zoomRate));
		var i, len, i2, i21, x, y, haspolya, haspolyb, polya, polyb;
		
		if (!different_layers)	// same layers: easy check
		{
			// Reject via bounding boxes first (fastest)
			if (!a.bbox.intersects_rect(b.bbox))
				return false;

			/**PREVIEWONLY**/this.polycheck_count++;

			// Reject via bounding quads second (presumably next fastest)
			if (!a.bquad.intersects_quad(b.bquad))
				return false;
				
			// Both objects are a tilemap: ignore, this condition is not supported
			if (a.tilemap_exists && b.tilemap_exists)
				return false;
			
			// Either object is a tilemap: run a separate tilemap collision test instead
			if (a.tilemap_exists)
				return this.testTilemapOverlap(a, b);
			if (b.tilemap_exists)
				return this.testTilemapOverlap(b, a);
				
			haspolya = (a.collision_poly && !a.collision_poly.is_empty());
			haspolyb = (b.collision_poly && !b.collision_poly.is_empty());
			
			// Neither have collision polys: in bounding quad overlap
			if (!haspolya && !haspolyb)
				return true;
				
			// Test collision polys if any.  Use temp_poly if
			// it only has a bouding quad and no poly (at most one object will have bounding quad).				
			if (haspolya)
			{
				a.collision_poly.cache_poly(a.width, a.height, a.angle);
				polya = a.collision_poly;
			}
			else
			{
				this.temp_poly.set_from_quad(a.bquad, a.x, a.y, a.width, a.height);
				polya = this.temp_poly;
			}
			
			if (haspolyb)
			{
				b.collision_poly.cache_poly(b.width, b.height, b.angle);
				polyb = b.collision_poly;
			}
			else
			{
				this.temp_poly.set_from_quad(b.bquad, b.x, b.y, b.width, b.height);
				polyb = this.temp_poly;
			}
			
			return polya.intersects_poly(polyb, b.x - a.x, b.y - a.y);
		}
		else	// different layers: need to do full translated check
		{
			haspolya = (a.collision_poly && !a.collision_poly.is_empty());
			haspolyb = (b.collision_poly && !b.collision_poly.is_empty());
			
			// Make sure both polya and polyb are cached in to temp_poly and temp_poly2,
			// since we need to change them by translating to the screen
			if (haspolya)
			{
				a.collision_poly.cache_poly(a.width, a.height, a.angle);
				this.temp_poly.set_from_poly(a.collision_poly);
			}
			else
			{
				this.temp_poly.set_from_quad(a.bquad, a.x, a.y, a.width, a.height);
			}
			
			polya = this.temp_poly;
			
			if (haspolyb)
			{
				b.collision_poly.cache_poly(b.width, b.height, b.angle);
				this.temp_poly2.set_from_poly(b.collision_poly);
			}
			else
			{
				this.temp_poly2.set_from_quad(b.bquad, b.x, b.y, b.width, b.height);
			}
			
			polyb = this.temp_poly2;
			
			// Both polya and polyb are relative to their own object co-ordinates.
			// Offset by the object co-ordinates and translate to screen.
			for (i = 0, len = polya.pts_count; i < len; i++)
			{
				i2 = i * 2;
				i21 = i2 + 1;
				x = polya.pts_cache[i2];
				y = polya.pts_cache[i21];

				polya.pts_cache[i2] = layera.layerToCanvas(x + a.x, y + a.y, true);
				polya.pts_cache[i21] = layera.layerToCanvas(x + a.x, y + a.y, false);
			}
			
			polya.update_bbox();

			for (i = 0, len = polyb.pts_count; i < len; i++)
			{
				i2 = i * 2;
				i21 = i2 + 1;
				x = polyb.pts_cache[i2];
				y = polyb.pts_cache[i21];
				
				polyb.pts_cache[i2] = layerb.layerToCanvas(x + b.x, y + b.y, true);
				polyb.pts_cache[i21] = layerb.layerToCanvas(x + b.x, y + b.y, false);
			}
			
			polyb.update_bbox();
			
			// Now they're both in screen co-ords, check for intersection
			/**PREVIEWONLY**/this.polycheck_count++;
			return polya.intersects_poly(polyb, 0, 0);
		}
	};
	
	var tmpQuad = new cr.quad();
	var tmpRect = new cr.rect(0, 0, 0, 0);
	var collrect_candidates = [];
	
	Runtime.prototype.testTilemapOverlap = function (tm, a)
	{
		var i, len, c, rc;
		var bbox = a.bbox;
		var tmx = tm.x;
		var tmy = tm.y;
		
		tm.getCollisionRectCandidates(bbox, collrect_candidates);
		
		var collrects = collrect_candidates;
		
		var haspolya = (a.collision_poly && !a.collision_poly.is_empty());
		
		for (i = 0, len = collrects.length; i < len; ++i)
		{
			c = collrects[i];
			rc = c.rc;
			/**PREVIEWONLY**/this.collisioncheck_count++;
			
			// First bounding box check
			if (bbox.intersects_rect_off(rc, tmx, tmy))
			{
				// Bounding box overlaps with this quad. Check bounding quad overlaps
				/**PREVIEWONLY**/this.polycheck_count++;
				tmpQuad.set_from_rect(rc);
				tmpQuad.offset(tmx, tmy);
				
				// Bounding quads overlap
				if (tmpQuad.intersects_quad(a.bquad))
				{
					// a has a poly: now check the collision poly against tmpQuad
					if (haspolya)
					{
						a.collision_poly.cache_poly(a.width, a.height, a.angle);
						
						// tile has a poly: run a poly-poly check
						if (c.poly)
						{
							if (c.poly.intersects_poly(a.collision_poly, a.x - (tmx + rc.left), a.y - (tmy + rc.top)))
							{
								cr.clearArray(collrect_candidates);
								return true;
							}
						}
						// tile has no poly: check the object poly against the temp quad
						else
						{
							this.temp_poly.set_from_quad(tmpQuad, 0, 0, rc.right - rc.left, rc.bottom - rc.top);
							
							if (this.temp_poly.intersects_poly(a.collision_poly, a.x, a.y))
							{
								cr.clearArray(collrect_candidates);
								return true;
							}
						}
					}
					// otherwise a has no poly
					else
					{
						// tile has a poly: test quad-poly intersection
						if (c.poly)
						{
							this.temp_poly.set_from_quad(a.bquad, 0, 0, a.width, a.height);
							
							if (c.poly.intersects_poly(this.temp_poly, -(tmx + rc.left), -(tmy + rc.top)))
							{
								cr.clearArray(collrect_candidates);
								return true;
							}
						}
						// tile has no poly: proved quad-rect intersection already
						else
						{
							cr.clearArray(collrect_candidates);
							return true;
						}
					}
				}
			}
		}
		
		// Didn't find overlapping any quad
		cr.clearArray(collrect_candidates);
		return false;
	};
	
	Runtime.prototype.testRectOverlap = function (r, b)
	{
		// Instances don't overlap themselves.  Also return false early if either object has collisions disabled.
		if (!b || !b.collisionsEnabled)
			return false;

		/**PREVIEWONLY**/this.collisioncheck_count++;
		
		b.update_bbox();
		
		var layerb = b.layer;
		var haspolyb, polyb;
		
		// Reject via bounding boxes first (fastest)
		if (!b.bbox.intersects_rect(r))
			return false;
		
		// Test rect against tilemap
		if (b.tilemap_exists)
		{
			b.getCollisionRectCandidates(r, collrect_candidates);
			
			var collrects = collrect_candidates;
			var i, len, c, tilerc;
			var tmx = b.x;
			var tmy = b.y;
			
			for (i = 0, len = collrects.length; i < len; ++i)
			{
				c = collrects[i];
				tilerc = c.rc;
				/**PREVIEWONLY**/this.collisioncheck_count++;
				
				if (r.intersects_rect_off(tilerc, tmx, tmy))
				{
					// Check against tile poly if present
					if (c.poly)
					{
						/**PREVIEWONLY**/this.polycheck_count++;
						
						this.temp_poly.set_from_rect(r, 0, 0);
						
						if (c.poly.intersects_poly(this.temp_poly, -(tmx + tilerc.left), -(tmy + tilerc.top)))
						{
							cr.clearArray(collrect_candidates);
							return true;
						}
					}
					// No poly: bounding boxes overlap so register a collision
					else
					{
						cr.clearArray(collrect_candidates);
						return true;
					}
				}
			}
			
			cr.clearArray(collrect_candidates);
			return false;
		}
		// Test rect against object
		else
		{
			/**PREVIEWONLY**/this.polycheck_count++;
				
			tmpQuad.set_from_rect(r);

			// Reject via bounding quads second (presumably next fastest)
			if (!b.bquad.intersects_quad(tmpQuad))
				return false;
			
			haspolyb = (b.collision_poly && !b.collision_poly.is_empty());
			
			// Does not have collision poly: must be in bounding quad overlap
			if (!haspolyb)
				return true;
				
			b.collision_poly.cache_poly(b.width, b.height, b.angle);
			tmpQuad.offset(-r.left, -r.top);
			this.temp_poly.set_from_quad(tmpQuad, 0, 0, 1, 1);
			
			return b.collision_poly.intersects_poly(this.temp_poly, r.left - b.x, r.top - b.y);
		}
	};
	
	Runtime.prototype.testSegmentOverlap = function (x1, y1, x2, y2, b)
	{
		if (!b || !b.collisionsEnabled)
			return false;

		/**PREVIEWONLY**/this.collisioncheck_count++;
		b.update_bbox();
		
		var layerb = b.layer;
		var haspolyb, polyb;
		
		// Reject via bounding boxes first (fastest). Create temporary bounding box around the segment.
		tmpRect.set(cr.min(x1, x2), cr.min(y1, y2), cr.max(x1, x2), cr.max(y1, y2));
		
		if (!b.bbox.intersects_rect(tmpRect))
			return false;
		
		// Test segment against tilemap
		if (b.tilemap_exists)
		{
			b.getCollisionRectCandidates(tmpRect, collrect_candidates);
			var collrects = collrect_candidates;
			var i, len, c, tilerc;
			var tmx = b.x;
			var tmy = b.y;
			
			for (i = 0, len = collrects.length; i < len; ++i)
			{
				c = collrects[i];
				tilerc = c.rc;
				/**PREVIEWONLY**/this.collisioncheck_count++;
				
				// Segment bounding box intersects this tile collision rectangle
				if (tmpRect.intersects_rect_off(tilerc, tmx, tmy))
				{
					/**PREVIEWONLY**/this.polycheck_count++;
					
					// Test real segment intersection
					tmpQuad.set_from_rect(tilerc);
					tmpQuad.offset(tmx, tmy);
					
					if (tmpQuad.intersects_segment(x1, y1, x2, y2))
					{
						// Check against tile collision poly if any
						if (c.poly)
						{
							if (c.poly.intersects_segment(tmx + tilerc.left, tmy + tilerc.top, x1, y1, x2, y2))
							{
								cr.clearArray(collrect_candidates);
								return true;
							}
						}
						// Otherwise is intersecting tile box
						else
						{
							cr.clearArray(collrect_candidates);
							return true;
						}
					}
				}
			}
			
			cr.clearArray(collrect_candidates);
			return false;
		}
		else
		{
			/**PREVIEWONLY**/this.polycheck_count++;

			// Reject via bounding quads second (presumably next fastest)
			if (!b.bquad.intersects_segment(x1, y1, x2, y2))
				return false;
			
			haspolyb = (b.collision_poly && !b.collision_poly.is_empty());
			
			// Does not have collision poly: must be in bounding quad intersection
			if (!haspolyb)
				return true;
				
			b.collision_poly.cache_poly(b.width, b.height, b.angle);
			
			return b.collision_poly.intersects_segment(b.x, b.y, x1, y1, x2, y2);
		}
	};
	
	Runtime.prototype.typeHasBehavior = function (t, b)
	{
		if (!b)
			return false;
		
		var i, len, j, lenj, f;
		for (i = 0, len = t.behaviors.length; i < len; i++)
		{
			if (t.behaviors[i].behavior instanceof b)
				return true;
		}
		
		// Also check family behaviors
		if (!t.is_family)
		{
			for (i = 0, len = t.families.length; i < len; i++)
			{
				f = t.families[i];
				
				for (j = 0, lenj = f.behaviors.length; j < lenj; j++)
				{
					if (f.behaviors[j].behavior instanceof b)
						return true;
				}
			}
		}
		
		return false;
	};
	
	Runtime.prototype.typeHasNoSaveBehavior = function (t)
	{
		return this.typeHasBehavior(t, cr.behaviors.NoSave);
	};
	
	Runtime.prototype.typeHasPersistBehavior = function (t)
	{
		return this.typeHasBehavior(t, cr.behaviors.Persist);
	};
	
	Runtime.prototype.getSolidBehavior = function ()
	{
		return this.solidBehavior;
	};
	
	Runtime.prototype.getJumpthruBehavior = function ()
	{
		return this.jumpthruBehavior;
	};
	
	var candidates = [];

	Runtime.prototype.testOverlapSolid = function (inst)
	{
		var i, len, s;

		inst.update_bbox();
		this.getSolidCollisionCandidates(inst.layer, inst.bbox, candidates);

		for (i = 0, len = candidates.length; i < len; ++i)
		{
			s = candidates[i];
			
			if (!s.extra["solidEnabled"])
				continue;
			
			if (this.testOverlap(inst, s))
			{
				cr.clearArray(candidates);
				return s;
			}
		}

		cr.clearArray(candidates);
		return null;
	};
	
	Runtime.prototype.testRectOverlapSolid = function (r)
	{
		var i, len, s;
		this.getSolidCollisionCandidates(null, r, candidates);

		for (i = 0, len = candidates.length; i < len; ++i)
		{
			s = candidates[i];
			
			if (!s.extra["solidEnabled"])
				continue;
			
			if (this.testRectOverlap(r, s))
			{
				cr.clearArray(candidates);
				return s;
			}
		}

		cr.clearArray(candidates);
		return null;
	};
	
	var jumpthru_array_ret = [];
	
	Runtime.prototype.testOverlapJumpThru = function (inst, all)
	{
		var ret = null;
		
		if (all)
		{
			ret = jumpthru_array_ret;
			cr.clearArray(ret);
		}

		inst.update_bbox();
		this.getJumpthruCollisionCandidates(inst.layer, inst.bbox, candidates);
		var i, len, j;
		
		for (i = 0, len = candidates.length; i < len; ++i)
		{
			j = candidates[i];
			
			if (!j.extra["jumpthruEnabled"])
				continue;
			
			if (this.testOverlap(inst, j))
			{
				if (all)
					ret.push(j);
				else
				{
					cr.clearArray(candidates);
					return j;
				}
			}
		}

		cr.clearArray(candidates);
		return ret;
	};

	// Push to try and move out of solid.  Pass -1, 0 or 1 for xdir and ydir to specify a push direction.
	Runtime.prototype.pushOutSolid = function (inst, xdir, ydir, dist, include_jumpthrus, specific_jumpthru)
	{
		var push_dist = dist || 50;

		var oldx = inst.x
		var oldy = inst.y;

		var i;
		var last_overlapped = null, secondlast_overlapped = null;

		for (i = 0; i < push_dist; i++)
		{
			inst.x = (oldx + (xdir * i));
			inst.y = (oldy + (ydir * i));
			inst.set_bbox_changed();
			
			// Test if we've cleared the last instance we were overlapping
			if (!this.testOverlap(inst, last_overlapped))
			{
				// See if we're still overlapping a different solid
				last_overlapped = this.testOverlapSolid(inst);
				
				if (last_overlapped)
					secondlast_overlapped = last_overlapped;
				
				// We're clear of all solids - check jumpthrus
				if (!last_overlapped)
				{
					if (include_jumpthrus)
					{
						if (specific_jumpthru)
							last_overlapped = (this.testOverlap(inst, specific_jumpthru) ? specific_jumpthru : null);
						else
							last_overlapped = this.testOverlapJumpThru(inst);
							
						if (last_overlapped)
							secondlast_overlapped = last_overlapped;
					}
					
					// Clear of both - completed push out.  Adjust fractionally to 1/16th of a pixel.
					if (!last_overlapped)
					{
						if (secondlast_overlapped)
							this.pushInFractional(inst, xdir, ydir, secondlast_overlapped, 16);
						
						return true;
					}
				}
			}
		}

		// Didn't get out a solid: oops, we're stuck.
		// Restore old position.
		inst.x = oldx;
		inst.y = oldy;
		inst.set_bbox_changed();
		return false;
	};
	
	Runtime.prototype.pushOut = function (inst, xdir, ydir, dist, otherinst)
	{
		var push_dist = dist || 50;

		var oldx = inst.x
		var oldy = inst.y;

		var i;

		for (i = 0; i < push_dist; i++)
		{
			inst.x = (oldx + (xdir * i));
			inst.y = (oldy + (ydir * i));
			inst.set_bbox_changed();
			
			// Test if we've cleared the last instance we were overlapping
			if (!this.testOverlap(inst, otherinst))
				return true;
		}

		// Didn't get out a solid: oops, we're stuck.
		// Restore old position.
		inst.x = oldx;
		inst.y = oldy;
		inst.set_bbox_changed();
		return false;
	};
	
	Runtime.prototype.pushInFractional = function (inst, xdir, ydir, obj, limit)
	{
		var divisor = 2;
		var frac;
		var forward = false;
		var overlapping = false;
		var bestx = inst.x;
		var besty = inst.y;
		
		while (divisor <= limit)
		{
			frac = 1 / divisor;
			divisor *= 2;
			
			inst.x += xdir * frac * (forward ? 1 : -1);
			inst.y += ydir * frac * (forward ? 1 : -1);
			inst.set_bbox_changed();
			
			if (this.testOverlap(inst, obj))
			{
				// Overlapped something: try going forward again
				forward = true;
				overlapping = true;
			}
			else
			{
				// Didn't overlap anything: keep going back
				forward = false;
				overlapping = false;
				bestx = inst.x;
				besty = inst.y;
			}
		}
		
		// If left overlapping, move back to last place not overlapping
		if (overlapping)
		{
			inst.x = bestx;
			inst.y = besty;
			inst.set_bbox_changed();
		}
	};
	
	// Find nearest position not overlapping a solid
	Runtime.prototype.pushOutSolidNearest = function (inst, max_dist_)
	{
		var max_dist = (cr.is_undefined(max_dist_) ? 100 : max_dist_);
		var dist = 0;
		var oldx = inst.x
		var oldy = inst.y;

		var dir = 0;
		var dx = 0, dy = 0;
		var last_overlapped = this.testOverlapSolid(inst);
		
		if (!last_overlapped)
			return true;		// already clear of solids
		
		// 8-direction spiral scan
		while (dist <= max_dist)
		{
			switch (dir) {
			case 0:		dx = 0; dy = -1; dist++; break;
			case 1:		dx = 1; dy = -1; break;
			case 2:		dx = 1; dy = 0; break;
			case 3:		dx = 1; dy = 1; break;
			case 4:		dx = 0; dy = 1; break;
			case 5:		dx = -1; dy = 1; break;
			case 6:		dx = -1; dy = 0; break;
			case 7:		dx = -1; dy = -1; break;
			}
			
			dir = (dir + 1) % 8;
			
			inst.x = cr.floor(oldx + (dx * dist));
			inst.y = cr.floor(oldy + (dy * dist));
			inst.set_bbox_changed();
			
			// Test if we've cleared the last instance we were overlapping
			if (!this.testOverlap(inst, last_overlapped))
			{
				// See if we're still overlapping a different solid
				last_overlapped = this.testOverlapSolid(inst);
				
				// We're clear of all solids
				if (!last_overlapped)
					return true;
			}
		}
		
		// Didn't get pushed out: restore old position and return false
		inst.x = oldx;
		inst.y = oldy;
		inst.set_bbox_changed();
		return false;
	};
	
	// For behaviors to register that a collision happened
	Runtime.prototype.registerCollision = function (a, b)
	{
		// Ignore if either instance has disabled collisions
		if (!a.collisionsEnabled || !b.collisionsEnabled)
			return;
		
		this.registered_collisions.push([a, b]);
	};
	
	Runtime.prototype.checkRegisteredCollision = function (a, b)
	{
		var i, len, x;
		for (i = 0, len = this.registered_collisions.length; i < len; i++)
		{
			x = this.registered_collisions[i];
			
			if ((x[0] == a && x[1] == b) || (x[0] == b && x[1] == a))
				return true;
		}
		
		return false;
	};
	
	Runtime.prototype.calculateSolidBounceAngle = function(inst, startx, starty, obj)
	{
		var objx = inst.x;
		var objy = inst.y;
		var radius = cr.max(10, cr.distanceTo(startx, starty, objx, objy));
		var startangle = cr.angleTo(startx, starty, objx, objy);
		var firstsolid = obj || this.testOverlapSolid(inst);
		
		// Not overlapping a solid: function used wrong, return inverse of object angle (so it bounces back in reverse direction)
		if (!firstsolid)
			return cr.clamp_angle(startangle + cr.PI);
			
		var cursolid = firstsolid;
		
		// Rotate anticlockwise in 5 degree increments until no longer overlapping
		// Don't search more than 175 degrees around (36 * 5 = 180)
		var i, curangle, anticlockwise_free_angle, clockwise_free_angle;
		var increment = cr.to_radians(5);	// 5 degree increments
		
		for (i = 1; i < 36; i++)
		{
			curangle = startangle - i * increment;
			inst.x = startx + Math.cos(curangle) * radius;
			inst.y = starty + Math.sin(curangle) * radius;
			inst.set_bbox_changed();
			
			// No longer overlapping current solid
			if (!this.testOverlap(inst, cursolid))
			{
				// Search for any other solid
				cursolid = obj ? null : this.testOverlapSolid(inst);
				
				// Not overlapping any other solid: we've now reached the anticlockwise free angle
				if (!cursolid)
				{
					anticlockwise_free_angle = curangle;
					break;
				}
			}
		}
		
		// Did not manage to free up in anticlockwise direction: use reverse angle
		if (i === 36)
			anticlockwise_free_angle = cr.clamp_angle(startangle + cr.PI);
			
		var cursolid = firstsolid;
			
		// Now search in clockwise direction
		for (i = 1; i < 36; i++)
		{
			curangle = startangle + i * increment;
			inst.x = startx + Math.cos(curangle) * radius;
			inst.y = starty + Math.sin(curangle) * radius;
			inst.set_bbox_changed();
			
			// No longer overlapping current solid
			if (!this.testOverlap(inst, cursolid))
			{
				// Search for any other solid
				cursolid = obj ? null : this.testOverlapSolid(inst);
				
				// Not overlapping any other solid: we've now reached the clockwise free angle
				if (!cursolid)
				{
					clockwise_free_angle = curangle;
					break;
				}
			}
		}
		
		// Did not manage to free up in clockwise direction: use reverse angle
		if (i === 36)
			clockwise_free_angle = cr.clamp_angle(startangle + cr.PI);
			
		// Put the object back to its original position
		inst.x = objx;
		inst.y = objy;
		inst.set_bbox_changed();
			
		// Both angles match: can only be if object completely contained by solid and both searches went all
		// the way round to backwards.  Just return the back angle.
		if (clockwise_free_angle === anticlockwise_free_angle)
			return clockwise_free_angle;
		
		// We now have the first anticlockwise and first clockwise angles that are free.
		// Calculate the normal.
		var half_diff = cr.angleDiff(clockwise_free_angle, anticlockwise_free_angle) / 2;
		var normal;
		
		// Acute angle
		if (cr.angleClockwise(clockwise_free_angle, anticlockwise_free_angle))
		{
			normal = cr.clamp_angle(anticlockwise_free_angle + half_diff + cr.PI);
		}
		// Obtuse angle
		else
		{
			normal = cr.clamp_angle(clockwise_free_angle + half_diff);
		}
		
		assert2(!isNaN(normal), "Bounce normal computed as NaN");
		
		// Reflect startangle about normal (r = v - 2 (v . n) n)
		var vx = Math.cos(startangle);
		var vy = Math.sin(startangle);
		var nx = Math.cos(normal);
		var ny = Math.sin(normal);
		var v_dot_n = vx * nx + vy * ny;
		var rx = vx - 2 * v_dot_n * nx;
		var ry = vy - 2 * v_dot_n * ny;
		return cr.angleTo(0, 0, rx, ry);
	};

	var triggerSheetIndex = -1;
	
	// Runtime: trigger an event
	Runtime.prototype.trigger = function (method, inst, value /* for fast triggers */)
	{
		assert2(!cr.is_string(method), "trigger() no longer accepts a string argument as of r51");
		
		// Keyboard etc. can fire events on loading screen, with no running layout.
		if (!this.running_layout)
			return false;
			
		var sheet = this.running_layout.event_sheet;

		if (!sheet)
			return false;     // no event sheet active; nothing to trigger

		var ret = false;
		var r, i, len;
		
		triggerSheetIndex++;
		
		// Trigger through all includes recursively (stored in deep_includes)
		var deep_includes = sheet.deep_includes;
		for (i = 0, len = deep_includes.length; i < len; ++i)
		{		
			r = this.triggerOnSheet(method, inst, deep_includes[i], value);
			ret = ret || r;
		}
		
		// Trigger on current sheet last (not included in deep_includes), since
		// this is the shallowest level of include
		r = this.triggerOnSheet(method, inst, sheet, value);
		ret = ret || r;
		
		triggerSheetIndex--;
		
		return ret;
    };

    Runtime.prototype.triggerOnSheet = function (method, inst, sheet, value)
    {
        // Recurse by also triggering on first-level includes of the current sheet.
        var ret = false;
		var i, leni, r, families;

		// Get the type name from the instance (assume null means system).
		// For instances, re-trigger for each family type too.
		if (!inst)
		{
			r = this.triggerOnSheetForTypeName(method, inst, "system", sheet, value);
			ret = ret || r;
		}
		else
		{
			r = this.triggerOnSheetForTypeName(method, inst, inst.type.name, sheet, value);
			ret = ret || r;
			
			families = inst.type.families;
			
			for (i = 0, leni = families.length; i < leni; ++i)
			{
				r = this.triggerOnSheetForTypeName(method, inst, families[i].name, sheet, value);
				ret = ret || r;
			}
		}

		return ret;             // true if anything got triggered
	};
	
	Runtime.prototype.triggerOnSheetForTypeName = function (method, inst, type_name, sheet, value)
	{
		var i, leni;
		var ret = false, ret2 = false;
		var trig, index;
		
		// If a value is provided, treat it as a fast trigger
		var fasttrigger = (typeof value !== "undefined");
		
		var triggers = (fasttrigger ? sheet.fasttriggers : sheet.triggers);
		var obj_entry = triggers[type_name];
		
		// No triggers for this object type in the event sheet
		if (!obj_entry)
			return ret;

		var triggers_list = null;
		
		for (i = 0, leni = obj_entry.length; i < leni; ++i)
		{
			// Found matching method
			if (obj_entry[i].method == method)
			{
				triggers_list = obj_entry[i].evs;
				break;
			}
		}

		// No triggers of this method in the event sheet
		if (!triggers_list)
			return ret;
			
		var triggers_to_fire;

		if (fasttrigger)
		{
			// Look up the specific value in the trigger map
			triggers_to_fire = triggers_list[value];
		}
		else
		{
			triggers_to_fire = triggers_list;
		}
		
		if (!triggers_to_fire)
			return null;
		
		// Trigger every event in the triggers list
		for (i = 0, leni = triggers_to_fire.length; i < leni; i++)
		{
			trig = triggers_to_fire[i][0];
			index = triggers_to_fire[i][1];

			ret2 = this.executeSingleTrigger(inst, type_name, trig, index);
			ret = ret || ret2;
		}
		
		return ret;
	};
	
	Runtime.prototype.executeSingleTrigger = function (inst, type_name, trig, index)
	{
		var i, leni;
		var ret = false;
		
		this.trigger_depth++;
		
		// Each trigger should have a clean SOL for objects it references.
		// Need to also push previous event's SOL to ensure passive references aren't used
		var current_event = this.getCurrentEventStack().current_event;
		
		if (current_event)
			this.pushCleanSol(current_event.solModifiersIncludingParents);
		
		var isrecursive = (this.trigger_depth > 1);		// calling trigger from inside another trigger
		
		this.pushCleanSol(trig.solModifiersIncludingParents);
		
		if (isrecursive)
			this.pushLocalVarStack();
		
		var event_stack = this.pushEventStack(trig);
		event_stack.current_event = trig;

		// Pick the triggering instance, if any
		if (inst)
		{
			var sol = this.types[type_name].getCurrentSol();
			sol.select_all = false;
			cr.clearArray(sol.instances);
			sol.instances[0] = inst;
			this.types[type_name].applySolToContainer();
		}

		// If the event has a parent, we need to run all its parent subevents
		// in conditions-only mode (not running actions) to set up the SOL
		var ok_to_run = true;

		if (trig.parent)
		{
			// Run up tree to top collecting parent blocks
			var temp_parents_arr = event_stack.temp_parents_arr;

			var cur_parent = trig.parent;

			while (cur_parent)
			{
				temp_parents_arr.push(cur_parent);
				cur_parent = cur_parent.parent;
			}

			// Run the parent conditions, but in reverse, to start from the top.
			temp_parents_arr.reverse();

			// Run the conditions above the trigger.
			for (i = 0, leni = temp_parents_arr.length; i < leni; i++)
			{
				if (!temp_parents_arr[i].run_pretrigger())   // parent event failed
				{
					// Prevent trigger running and stop this loop
					ok_to_run = false;
					break;
				}
			}
		}

		// At last, run the trigger event, if none of the parents failed.
		if (ok_to_run)
		{
			this.execcount++;
			
			if (trig.orblock)
				trig.run_orblocktrigger(index);
			else
				trig.run();
			
			// Return true if at least one event successfully ran
			ret = ret || event_stack.last_event_true;
		}
		
		this.popEventStack();
		
		if (isrecursive)
			this.popLocalVarStack();

		// Pop the trigger's SOLs
		this.popSol(trig.solModifiersIncludingParents);
		
		if (current_event)
			this.popSol(current_event.solModifiersIncludingParents);
		
		// Clear death row between top-level events which were not triggered
		// during event interpretation (to avoid mangling SOL/instance lists during execution)
		if (this.hasPendingInstances && this.isInOnDestroy === 0 && triggerSheetIndex === 0 && !this.isRunningEvents)
		{
			this.ClearDeathRow();
		}
		
		this.trigger_depth--;
		return ret;
	};
	
	Runtime.prototype.getCurrentCondition = function ()
	{
		var evinfo = this.getCurrentEventStack();
		return evinfo.current_event.conditions[evinfo.cndindex];
	};
	
	Runtime.prototype.getCurrentConditionObjectType = function ()
	{
		var cnd = this.getCurrentCondition();
		return cnd.type;
	};
	
	Runtime.prototype.isCurrentConditionFirst = function ()
	{
		var evinfo = this.getCurrentEventStack();
		return evinfo.cndindex === 0;
	};
	
	Runtime.prototype.getCurrentAction = function ()
	{
		var evinfo = this.getCurrentEventStack();
		return evinfo.current_event.actions[evinfo.actindex];
	};
	
	Runtime.prototype.pushLocalVarStack = function ()
	{
		this.localvar_stack_index++;
		
		if (this.localvar_stack_index >= this.localvar_stack.length)
			this.localvar_stack.push([]);
	};
	
	Runtime.prototype.popLocalVarStack = function ()
	{
		assert2(this.localvar_stack_index > 0, "Popping last local var stack - check pushLocalVarStack/popLocalVarStack pairs");
		
		this.localvar_stack_index--;
	};
	
	Runtime.prototype.getCurrentLocalVarStack = function ()
	{
		return this.localvar_stack[this.localvar_stack_index];
	};

	Runtime.prototype.pushEventStack = function (cur_event)
	{
		this.event_stack_index++;
		
		// Create a new stack frame if necessary, else recycling old one
		if (this.event_stack_index >= this.event_stack.length)
			this.event_stack.push(new cr.eventStackFrame());
		
		var ret = this.getCurrentEventStack();
		ret.reset(cur_event);
		return ret;
	};

	Runtime.prototype.popEventStack = function ()
	{
		assert2(this.event_stack_index > 0, "Popping last event stack frame - check pushEventStack/popEventStack pairs");

		this.event_stack_index--;
	};

	Runtime.prototype.getCurrentEventStack = function ()
	{
		return this.event_stack[this.event_stack_index];
	};

	Runtime.prototype.pushLoopStack = function (name_)
	{
		this.loop_stack_index++;
		
		if (this.loop_stack_index >= this.loop_stack.length)
		{
			this.loop_stack.push(cr.seal({ name: name_, index: 0, stopped: false }));
		}
			
		var ret = this.getCurrentLoop();
		ret.name = name_;
		ret.index = 0;
		ret.stopped = false;
		return ret;
	};

	Runtime.prototype.popLoopStack = function ()
	{
		assert2(this.loop_stack_index >= 0, "Popping loop stack when empty, check pushLoopStack/popLoopStack pairs");

		this.loop_stack_index--;
	};

	Runtime.prototype.getCurrentLoop = function ()
	{
		return this.loop_stack[this.loop_stack_index];
	};

	Runtime.prototype.getEventVariableByName = function (name, scope)
	{
		var i, leni, j, lenj, sheet, e;

		// Search upwards through scope
		while (scope)
		{
			for (i = 0, leni = scope.subevents.length; i < leni; i++)
			{
				e = scope.subevents[i];

				if (e instanceof cr.eventvariable && cr.equals_nocase(name, e.name))
					return e;
			}

			scope = scope.parent;
		}

		// Check global scope (all variables in all event sheets at root level)
		for (i = 0, leni = this.eventsheets_by_index.length; i < leni; i++)
		{
			sheet = this.eventsheets_by_index[i];

			for (j = 0, lenj = sheet.events.length; j < lenj; j++)
			{
				e = sheet.events[j];

				if (e instanceof cr.eventvariable && cr.equals_nocase(name, e.name))
					return e;
			}
		}

		return null;
	};
	
	Runtime.prototype.getLayoutBySid = function (sid_)
	{
		var i, len;
		for (i = 0, len = this.layouts_by_index.length; i < len; i++)
		{
			if (this.layouts_by_index[i].sid === sid_)
				return this.layouts_by_index[i];
		}
		
		return null;
	};
	
	Runtime.prototype.getObjectTypeBySid = function (sid_)
	{
		var i, len;
		for (i = 0, len = this.types_by_index.length; i < len; i++)
		{
			if (this.types_by_index[i].sid === sid_)
				return this.types_by_index[i];
		}
		
		return null;
	};
	
	Runtime.prototype.getGroupBySid = function (sid_)
	{
		var i, len;
		for (i = 0, len = this.allGroups.length; i < len; i++)
		{
			if (this.allGroups[i].sid === sid_)
				return this.allGroups[i];
		}
		
		return null;
	};
	
	Runtime.prototype.doCanvasSnapshot = function (format_, quality_)
	{
		this.snapshotCanvas = [format_, quality_];
		this.redraw = true;		// force redraw so snapshot is always taken
	};
	
	/**BEGIN-PREVIEWONLY**/
	Runtime.prototype.debugBreak = function ()
	{
		this.hit_breakpoint = true;
		this.step_break = false;
		this.resuming_breakpoint = false;
		this["setSuspended"](true);
		
		var breakpoint_str = this.breakpoint_event.display_number + "," + this.breakpoint_event.sheet.name + ",";
		breakpoint_str += (this.breakpoint_condition ? this.breakpoint_condition.index : -1) + ",";
		breakpoint_str += (this.breakpoint_action ? this.breakpoint_action.index : -1);
		
		// Send the breakpoint notification 50ms late. This is because when moving between breakpoints (where a
		// resume and break happen in quick sequence) sometimes the AJAX requests arrive in the wrong order,
		// with the breakpoint-off for the resume arriving after the breakpoint-on for the break (even though
		// it was issued after), and the break highlight disappears in the editor. The 50ms delay is a workaround
		// to try avoid this.
		setTimeout(function () {
			var request = new XMLHttpRequest();
			request.open("GET", "_breakpoint_?_=" + Date.now() + "&bp=" + encodeURIComponent(breakpoint_str));		
			request.send();
		}, 50);
	};
	
	Runtime.prototype.debugResume = function ()
	{
		var request = new XMLHttpRequest();
		request.open("GET", "_breakpoint_?_=" + Date.now() + "&bp=off");		
		request.send();
		
		this.hit_breakpoint = false;
		this.resuming_breakpoint = true;
		this["setSuspended"](false);
	};
	/**END-PREVIEWONLY**/
	
	function IsIndexedDBAvailable()
	{
		// Firefox is terrible and throws even trying to check if IndexedDB exists in some modes.
		try {
			return !!window.indexedDB;
		}
		catch (e)
		{
			return false;
		}
	};
	
	function makeSaveDb(e)
	{
		var db = e.target.result;
		db.createObjectStore("saves", { keyPath: "slot" });
	};
	
	function IndexedDB_WriteSlot(slot_, data_, oncomplete_, onerror_)
	{
		// some platforms throw when storage not allowed
		try {
			var request = indexedDB.open("_C2SaveStates");
			request.onupgradeneeded = makeSaveDb;
			
			request.onerror = onerror_;
			request.onsuccess = function (e)
			{
				var db = e.target.result;
				db.onerror = onerror_;
				
				var transaction = db.transaction(["saves"], "readwrite");
				var objectStore = transaction.objectStore("saves");
				var putReq = objectStore.put({"slot": slot_, "data": data_ });
				putReq.onsuccess = oncomplete_;
			};
		}
		catch (err)
		{
			onerror_(err);
		}
	};
	
	function IndexedDB_ReadSlot(slot_, oncomplete_, onerror_)
	{
		try {
			var request = indexedDB.open("_C2SaveStates");
			request.onupgradeneeded = makeSaveDb;
			request.onerror = onerror_;
			request.onsuccess = function (e)
			{
				var db = e.target.result;
				db.onerror = onerror_;
				
				var transaction = db.transaction(["saves"]);
				var objectStore = transaction.objectStore("saves");
				var readReq = objectStore.get(slot_);
				readReq.onsuccess = function (e)
				{
					if (readReq.result)
						oncomplete_(readReq.result["data"]);
					else
						oncomplete_(null);
				};
			};
		}
		catch (err)
		{
			onerror_(err);
		}
	};
	
	Runtime.prototype.signalContinuousPreview = function ()
	{
		this.signalledContinuousPreview = true;
	};
	
	function doContinuousPreviewReload()
	{
		cr.logexport("Reloading for continuous preview");
		
		if (!!window["c2cocoonjs"])
		{
			CocoonJS["App"]["reload"]();
		}
		else
		{
			if (window.location.search.indexOf("continuous") > -1)
				window.location.reload(true);
			else
				window.location = window.location + "?continuous";
		}
	};
	
	/**BEGIN-PREVIEWONLY**/
	Runtime.prototype.stepIfPausedInDebugger = function ()
	{
		// When paused in debugger, fire another tick after successful load so game updates
		if (this.isSuspended && this.isDebug)
		{
			this.last_tick_time = cr.performance_now();
			this.tick(false);
		}
	};
	/**END-PREVIEWONLY**/
	
	Runtime.prototype.handleSaveLoad = function ()
	{
		var self = this;
		var savingToSlot = this.saveToSlot;
		var savingJson = this.lastSaveJson;
		var loadingFromSlot = this.loadFromSlot;
		var continuous = false;
		
		if (this.signalledContinuousPreview)
		{
			continuous = true;
			savingToSlot = "__c2_continuouspreview";
			this.signalledContinuousPreview = false;
		}
		
		// Save or load game state if set
		if (savingToSlot.length)
		{
			this.ClearDeathRow();
			
			savingJson = this.saveToJSONString();
			
			// Try saving to indexedDB first if available
			if (IsIndexedDBAvailable() && !this.isCocoonJs)
			{
				IndexedDB_WriteSlot(savingToSlot, savingJson, function ()
				{
					cr.logexport("Saved state to IndexedDB storage (" + savingJson.length + " bytes)");
					
					// Trigger 'On save complete'
					self.lastSaveJson = savingJson;
					self.trigger(cr.system_object.prototype.cnds.OnSaveComplete, null);
					self.lastSaveJson = "";
					
					if (continuous)
						doContinuousPreviewReload();
					
				}, function (e)
				{
					// Saving to indexedDB failed: try saving back to WebStorage instead
					try {
						localStorage.setItem("__c2save_" + savingToSlot, savingJson);
						
						cr.logexport("Saved state to WebStorage (" + savingJson.length + " bytes)");
						
						// Trigger 'On save complete'
						self.lastSaveJson = savingJson;
						self.trigger(cr.system_object.prototype.cnds.OnSaveComplete, null);
						self.lastSaveJson = "";
						
						if (continuous)
							doContinuousPreviewReload();
					}
					catch (f)
					{
						cr.logexport("Failed to save game state: " + e + "; " + f);
						self.trigger(cr.system_object.prototype.cnds.OnSaveFailed, null);
					}
				});
			}
			else
			{
				// IndexedDB not supported - just dump to WebStorage
				try {
					localStorage.setItem("__c2save_" + savingToSlot, savingJson);
					
					cr.logexport("Saved state to WebStorage (" + savingJson.length + " bytes)");
					
					// Trigger 'On save complete'
					self.lastSaveJson = savingJson;
					this.trigger(cr.system_object.prototype.cnds.OnSaveComplete, null);
					self.lastSaveJson = "";
					
					if (continuous)
						doContinuousPreviewReload();
				}
				catch (e)
				{
					cr.logexport("Error saving to WebStorage: " + e);
					self.trigger(cr.system_object.prototype.cnds.OnSaveFailed, null);
				}
			}
			
			this.saveToSlot = "";
			this.loadFromSlot = "";
			this.loadFromJson = "";
		}
		
		if (loadingFromSlot.length)
		{
			if (IsIndexedDBAvailable() && !this.isCocoonJs)
			{
				IndexedDB_ReadSlot(loadingFromSlot, function (result_)
				{
					// Load the result data. If no record was found, check if WebStorage contains it instead
					if (result_)
					{
						self.loadFromJson = result_;
						cr.logexport("Loaded state from IndexedDB storage (" + self.loadFromJson.length + " bytes)");
					}
					else
					{
						self.loadFromJson = localStorage.getItem("__c2save_" + loadingFromSlot) || "";
						cr.logexport("Loaded state from WebStorage (" + self.loadFromJson.length + " bytes)");
					}
					self.suspendDrawing = false;
					
					// If empty trigger 'On load failed'
					if (!self.loadFromJson.length)
						self.trigger(cr.system_object.prototype.cnds.OnLoadFailed, null);
					
					/**PREVIEWONLY**/self.stepIfPausedInDebugger();
					
				}, function (e)
				{
					// Check if WebStorage contains this slot instead
					self.loadFromJson = localStorage.getItem("__c2save_" + loadingFromSlot) || "";
					cr.logexport("Loaded state from WebStorage (" + self.loadFromJson.length + " bytes)");
					self.suspendDrawing = false;
					
					// If empty trigger 'On load failed'
					if (!self.loadFromJson.length)
						self.trigger(cr.system_object.prototype.cnds.OnLoadFailed, null);
					
					/**PREVIEWONLY**/self.stepIfPausedInDebugger();
				});
			}
			else
			{
				try {
					// Read JSON string from WebStorage then continue to load that
					this.loadFromJson = localStorage.getItem("__c2save_" + loadingFromSlot) || "";
					cr.logexport("Loaded state from WebStorage (" + this.loadFromJson.length + " bytes)");
				}
				catch (e)
				{
					this.loadFromJson = "";
				}
				
				this.suspendDrawing = false;
				
				// If empty trigger 'On load failed'
				if (!self.loadFromJson.length)
					self.trigger(cr.system_object.prototype.cnds.OnLoadFailed, null);
			}
			
			this.loadFromSlot = "";
			this.saveToSlot = "";
		}
		
		if (this.loadFromJson.length)
		{
			this.ClearDeathRow();
			
			this.loadFromJSONString(this.loadFromJson);
			
			// Trigger 'On load complete'
			this.lastSaveJson = this.loadFromJson;
			this.trigger(cr.system_object.prototype.cnds.OnLoadComplete, null);
			this.lastSaveJson = "";
			
			this.loadFromJson = "";
		}
	};
	
	function CopyExtraObject(extra)
	{
		// Some objects store various non-JSON compatible objects in their 'extra' fields.
		// This function copies fields to a new object skipping those which are known not to work.
		var p, ret = {};
		for (p in extra)
		{
			if (extra.hasOwnProperty(p))
			{
				// Don't save ObjectSets, since they need proper constructing
				if (extra[p] instanceof cr.ObjectSet)
					continue;
				// Don't save references to Box2D bodies, identified by their c2userdata member
				if (extra[p] && typeof extra[p].c2userdata !== "undefined")
					continue;
				
				// Don't save a key called "spriteCreatedDestroyCallback", Sprite uses it to know
				// whether to create a destroy callback
				if (p === "spriteCreatedDestroyCallback")
					continue;
					
				ret[p] = extra[p];
			}
		}
		
		return ret;
	};
	
	Runtime.prototype.saveToJSONString = function()
	{
		var i, len, j, lenj, type, layout, typeobj, g, c, a, v, p;
		
		var o = {
			"c2save":				true,
			"version":				1,
			"rt": {
				"time":				this.kahanTime.sum,
				"walltime":			this.wallTime.sum,
				"timescale":		this.timescale,
				"tickcount":		this.tickcount,
				"execcount":		this.execcount,
				"next_uid":			this.next_uid,
				"running_layout":	this.running_layout.sid,
				"start_time_offset": (Date.now() - this.start_time)
			},
			"types": {},
			"layouts": {},
			"events": {
				"groups": {},
				"cnds": {},
				"acts": {},
				"vars": {}
			}
		};
		
		// Save types - skip families since they have duplicate references to the real instances
		for (i = 0, len = this.types_by_index.length; i < len; i++)
		{
			type = this.types_by_index[i];
			
			if (type.is_family || this.typeHasNoSaveBehavior(type))
				continue;
			
			typeobj = {
				"instances": []
			};
			
			if (cr.hasAnyOwnProperty(type.extra))
				typeobj["ex"] = CopyExtraObject(type.extra);
			
			for (j = 0, lenj = type.instances.length; j < lenj; j++)
			{
				typeobj["instances"].push(this.saveInstanceToJSON(type.instances[j]));
			}
			
			o["types"][type.sid.toString()] = typeobj;
		}
		
		// Save layouts
		for (i = 0, len = this.layouts_by_index.length; i < len; i++)
		{
			layout = this.layouts_by_index[i];
			o["layouts"][layout.sid.toString()] = layout.saveToJSON();
		}
		
		// Save event data: group activation states
		var ogroups = o["events"]["groups"];
		for (i = 0, len = this.allGroups.length; i < len; i++)
		{
			g = this.allGroups[i];
			ogroups[g.sid.toString()] = this.groups_by_name[g.group_name].group_active;
		}
		
		// condition extras
		var ocnds = o["events"]["cnds"];
		for (p in this.cndsBySid)
		{
			if (this.cndsBySid.hasOwnProperty(p))
			{
				c = this.cndsBySid[p];
				if (cr.hasAnyOwnProperty(c.extra))
					ocnds[p] = { "ex": CopyExtraObject(c.extra) };
			}
		}
		
		// action extras
		var oacts = o["events"]["acts"];
		for (p in this.actsBySid)
		{
			if (this.actsBySid.hasOwnProperty(p))
			{
				a = this.actsBySid[p];
				if (cr.hasAnyOwnProperty(a.extra))
					oacts[p] = { "ex": CopyExtraObject(a.extra) };
			}
		}
		
		// variable extras
		var ovars = o["events"]["vars"];
		for (p in this.varsBySid)
		{
			if (this.varsBySid.hasOwnProperty(p))
			{
				v = this.varsBySid[p];
				
				// Save global or static local vars
				if (!v.is_constant && (!v.parent || v.is_static))
					ovars[p] = v.data;
			}
		}
		
		o["system"] = this.system.saveToJSON();
		
		return JSON.stringify(o);
	};
	
	Runtime.prototype.refreshUidMap = function ()
	{
		var i, len, type, j, lenj, inst;
		this.objectsByUid = {};
		
		for (i = 0, len = this.types_by_index.length; i < len; i++)
		{
			type = this.types_by_index[i];
			
			if (type.is_family)
				continue;
			
			for (j = 0, lenj = type.instances.length; j < lenj; j++)
			{
				inst = type.instances[j];
				this.objectsByUid[inst.uid.toString()] = inst;
			}
		}
	};
	
	Runtime.prototype.loadFromJSONString = function (str)
	{
		var o = JSON.parse(str);
		
		if (!o["c2save"])
			return;		// probably not a c2 save state
		
		if (o["version"] > 1)
			return;		// from future version of c2; assume not compatible
		
		this.isLoadingState = true;
		
		var rt = o["rt"];
		this.kahanTime.reset();
		this.kahanTime.sum = rt["time"];
		this.wallTime.reset();
		this.wallTime.sum = rt["walltime"] || 0;
		this.timescale = rt["timescale"];
		this.tickcount = rt["tickcount"];
		this.execcount = rt["execcount"];
		this.start_time = Date.now() - rt["start_time_offset"];
		
		var layout_sid = rt["running_layout"];
		
		// Need to change to different layout
		if (layout_sid !== this.running_layout.sid)
		{
			var changeToLayout = this.getLayoutBySid(layout_sid);
			
			if (changeToLayout)
				this.doChangeLayout(changeToLayout);
			else
				return;		// layout that was saved on has gone missing (deleted?)
		}
		
		// Load all types
		var i, len, j, lenj, k, lenk, p, type, existing_insts, load_insts, inst, binst, layout, layer, g, iid, t;
		var otypes = o["types"];
		
		for (p in otypes)
		{
			if (otypes.hasOwnProperty(p))
			{
				type = this.getObjectTypeBySid(parseInt(p, 10));
				
				if (!type || type.is_family || this.typeHasNoSaveBehavior(type))
					continue;
				
				if (otypes[p]["ex"])
					type.extra = otypes[p]["ex"];
				else
					cr.wipe(type.extra);
				
				// Recycle any existing objects if possible
				existing_insts = type.instances;
				load_insts = otypes[p]["instances"];
				
				for (i = 0, len = cr.min(existing_insts.length, load_insts.length); i < len; i++)
				{
					// Can load directly in to existing instance
					this.loadInstanceFromJSON(existing_insts[i], load_insts[i]);
				}
				
				// Destroy the rest of the existing instances if there are too many
				for (i = load_insts.length, len = existing_insts.length; i < len; i++)
					this.DestroyInstance(existing_insts[i]);
					
				// Create additional instances if there are not enough existing instances
				for (i = existing_insts.length, len = load_insts.length; i < len; i++)
				{
					layer = null;
					
					if (type.plugin.is_world)
					{
						layer = this.running_layout.getLayerBySid(load_insts[i]["w"]["l"]);
						
						// layer's gone missing - just skip creating this instance
						if (!layer)
							continue;
					}
					
					// create an instance then load the state in to it
					// skip creating siblings; they will have been saved as well, we'll link them up later
					inst = this.createInstanceFromInit(type.default_instance, layer, false, 0, 0, true);
					this.loadInstanceFromJSON(inst, load_insts[i]);
				}
				
				type.stale_iids = true;
			}
		}
		
		this.ClearDeathRow();
		
		// Rebuild the objectsByUid map, since some objects will have loaded a different UID to the one
		// they were created with
		this.refreshUidMap();
		
		// Load all layouts
		var olayouts = o["layouts"];
		
		for (p in olayouts)
		{
			if (olayouts.hasOwnProperty(p))
			{
				layout = this.getLayoutBySid(parseInt(p, 10));
				
				if (!layout)
					continue;		// must've gone missing
					
				layout.loadFromJSON(olayouts[p]);
			}
		}
		
		// Load event states
		var ogroups = o["events"]["groups"];
		for (p in ogroups)
		{
			if (ogroups.hasOwnProperty(p))
			{
				g = this.getGroupBySid(parseInt(p, 10));
				
				if (g && this.groups_by_name[g.group_name])
					this.groups_by_name[g.group_name].setGroupActive(ogroups[p]);
			}
		}
		
		var ocnds = o["events"]["cnds"];
		for (p in this.cndsBySid)
		{
			if (this.cndsBySid.hasOwnProperty(p))
			{
				if (ocnds.hasOwnProperty(p))
				{
					this.cndsBySid[p].extra = ocnds[p]["ex"];
				}
				else
				{
					// Reset extra object to clear as it must have been upon saving if the save record is missing.
					this.cndsBySid[p].extra = {};
				}
			}
		}
		
		var oacts = o["events"]["acts"];
		for (p in this.actsBySid)
		{
			if (this.actsBySid.hasOwnProperty(p))
			{
				if (oacts.hasOwnProperty(p))
				{
					this.actsBySid[p].extra = oacts[p]["ex"];
				}
				else
				{
					this.actsBySid[p].extra = {};
				}
			}
		}
		
		var ovars = o["events"]["vars"];
		for (p in ovars)
		{
			if (ovars.hasOwnProperty(p) && this.varsBySid.hasOwnProperty(p))
			{
				this.varsBySid[p].data = ovars[p];
			}
		}
		
		this.next_uid = rt["next_uid"];
		this.isLoadingState = false;
		
		// Fire "On created" for any instances created during loading
		for (i = 0, len = this.fireOnCreateAfterLoad.length; i < len; ++i)
		{
			inst = this.fireOnCreateAfterLoad[i];
			this.trigger(Object.getPrototypeOf(inst.type.plugin).cnds.OnCreated, inst);
		}
		
		cr.clearArray(this.fireOnCreateAfterLoad);
		
		this.system.loadFromJSON(o["system"]);
		
		// Loop again and call afterLoad() on everything now that UIDs and all states are available
		// Also link together containers now that all objects are created
		for (i = 0, len = this.types_by_index.length; i < len; i++)
		{
			type = this.types_by_index[i];
			
			// note don't call afterLoad() on types with the No Save behavior - they completely ignore
			// the whole save/load cycle.
			if (type.is_family || this.typeHasNoSaveBehavior(type))
				continue;
			
			for (j = 0, lenj = type.instances.length; j < lenj; j++)
			{
				inst = type.instances[j];
				
				// Link container
				if (type.is_contained)
				{
					iid = inst.get_iid();
					cr.clearArray(inst.siblings);
					
					for (k = 0, lenk = type.container.length; k < lenk; k++)
					{
						t = type.container[k];
						
						if (type === t)
							continue;
							
						assert2(t.instances.length > iid, "Missing sibling instance when linking containers after load");
						inst.siblings.push(t.instances[iid]);
					}
				}
				
				if (inst.afterLoad)
					inst.afterLoad();
				
				if (inst.behavior_insts)
				{
					for (k = 0, lenk = inst.behavior_insts.length; k < lenk; k++)
					{
						binst = inst.behavior_insts[k];
						
						if (binst.afterLoad)
							binst.afterLoad();
					}
				}
			}
		}
		
		this.redraw = true;
	};
	
	Runtime.prototype.saveInstanceToJSON = function(inst, state_only)
	{
		var i, len, world, behinst, et;
		var type = inst.type;
		var plugin = type.plugin;
		
		var o = {};
		
		if (state_only)
			o["c2"] = true;		// mark as known json data from Construct 2
		else
			o["uid"] = inst.uid;
		
		if (cr.hasAnyOwnProperty(inst.extra))
			o["ex"] = CopyExtraObject(inst.extra);
		
		// Save instance variables
		if (inst.instance_vars && inst.instance_vars.length)
		{
			o["ivs"] = {};
			
			for (i = 0, len = inst.instance_vars.length; i < len; i++)
			{
				o["ivs"][inst.type.instvar_sids[i].toString()] = inst.instance_vars[i];
			}
		}
		
		// Save world data
		if (plugin.is_world)
		{
			world = {
				"x": inst.x,
				"y": inst.y,
				"w": inst.width,
				"h": inst.height,
				"l": inst.layer.sid,
				"zi": inst.get_zindex()
			};
			
			if (inst.angle !== 0)
				world["a"] = inst.angle;
				
			if (inst.opacity !== 1)
				world["o"] = inst.opacity;
				
			if (inst.hotspotX !== 0.5)
				world["hX"] = inst.hotspotX;
				
			if (inst.hotspotY !== 0.5)
				world["hY"] = inst.hotspotY;
				
			if (inst.blend_mode !== 0)
				world["bm"] = inst.blend_mode;
				
			if (!inst.visible)
				world["v"] = inst.visible;
				
			if (!inst.collisionsEnabled)
				world["ce"] = inst.collisionsEnabled;
				
			if (inst.my_timescale !== -1)
				world["mts"] = inst.my_timescale;
			
			if (type.effect_types.length)
			{
				world["fx"] = [];
				
				for (i = 0, len = type.effect_types.length; i < len; i++)
				{
					et = type.effect_types[i];
					world["fx"].push({"name": et.name,
									  "active": inst.active_effect_flags[et.index],
									  "params": inst.effect_params[et.index] });
				}
			}
			
			o["w"] = world;
		}
		
		// Save behaviors
		if (inst.behavior_insts && inst.behavior_insts.length)
		{
			o["behs"] = {};
			
			for (i = 0, len = inst.behavior_insts.length; i < len; i++)
			{
				behinst = inst.behavior_insts[i];
				
				if (behinst.saveToJSON)
					o["behs"][behinst.type.sid.toString()] = behinst.saveToJSON();
			}
		}
		
		// Save plugin own data
		if (inst.saveToJSON)
			o["data"] = inst.saveToJSON();
		
		return o;
	};
	
	Runtime.prototype.getInstanceVarIndexBySid = function (type, sid_)
	{
		var i, len;
		for (i = 0, len = type.instvar_sids.length; i < len; i++)
		{
			if (type.instvar_sids[i] === sid_)
				return i;
		}
		
		return -1;
	};
	
	Runtime.prototype.getBehaviorIndexBySid = function (inst, sid_)
	{
		var i, len;
		for (i = 0, len = inst.behavior_insts.length; i < len; i++)
		{
			if (inst.behavior_insts[i].type.sid === sid_)
				return i;
		}
		
		return -1;
	};
	
	Runtime.prototype.loadInstanceFromJSON = function(inst, o, state_only)
	{
		var p, i, len, iv, oivs, world, fxindex, obehs, behindex;
		var oldlayer;
		var type = inst.type;
		var plugin = type.plugin;
		
		// state_only is used for saving/loading individual object states, in which
		// case we don't want to change the permanent UID
		if (state_only)
		{
			// check json data looks like it came from Construct 2
			if (!o["c2"])
				return;
		}
		else
			inst.uid = o["uid"];
		
		if (o["ex"])
			inst.extra = o["ex"];
		else
			cr.wipe(inst.extra);
		
		// Load instance variables
		oivs = o["ivs"];
		
		if (oivs)
		{
			for (p in oivs)
			{
				if (oivs.hasOwnProperty(p))
				{
					iv = this.getInstanceVarIndexBySid(type, parseInt(p, 10));
					
					if (iv < 0 || iv >= inst.instance_vars.length)
						continue;		// must've gone missing
						
					inst.instance_vars[iv] = oivs[p];
				}
			}
		}
		
		// Load world data
		if (plugin.is_world)
		{
			world = o["w"];
			
			// If instance is not on its intended layer, move it there now
			if (inst.layer.sid !== world["l"])
			{
				oldlayer = inst.layer;
				inst.layer = this.running_layout.getLayerBySid(world["l"]);
				
				if (inst.layer)
				{
					oldlayer.removeFromInstanceList(inst, true);
					inst.layer.appendToInstanceList(inst, true);
					
					inst.set_bbox_changed();
					inst.layer.setZIndicesStaleFrom(0);
				}
				else
				{
					// Object's layer has gone missing. Destroy this instance if full-state loading,
					// otherwise (e.g. 'load from json string' action) just leave it where it is.
					inst.layer = oldlayer;
					
					if (!state_only)
						this.DestroyInstance(inst);
				}
			}
			
			inst.x = world["x"];
			inst.y = world["y"];
			inst.width = world["w"];
			inst.height = world["h"];
			inst.zindex = world["zi"];
			inst.angle = world.hasOwnProperty("a") ? world["a"] : 0;
			inst.opacity = world.hasOwnProperty("o") ? world["o"] : 1;
			inst.hotspotX = world.hasOwnProperty("hX") ? world["hX"] : 0.5;
			inst.hotspotY = world.hasOwnProperty("hY") ? world["hY"] : 0.5;
			inst.visible = world.hasOwnProperty("v") ? world["v"] : true;
			inst.collisionsEnabled = world.hasOwnProperty("ce") ? world["ce"] : true;
			inst.my_timescale = world.hasOwnProperty("mts") ? world["mts"] : -1;
			
			inst.blend_mode = world.hasOwnProperty("bm") ? world["bm"] : 0;;
			inst.compositeOp = cr.effectToCompositeOp(inst.blend_mode);
			
			if (this.gl)
				cr.setGLBlend(inst, inst.blend_mode, this.gl);
						
			inst.set_bbox_changed();
			
			if (world.hasOwnProperty("fx"))
			{
				// Load effects and effect parameters
				for (i = 0, len = world["fx"].length; i < len; i++)
				{
					fxindex = type.getEffectIndexByName(world["fx"][i]["name"]);
					
					if (fxindex < 0)
						continue;		// must've gone missing
						
					inst.active_effect_flags[fxindex] = world["fx"][i]["active"];
					inst.effect_params[fxindex] = world["fx"][i]["params"];
				}
			}
			
			inst.updateActiveEffects();
		}
		
		// Load behaviors
		obehs = o["behs"];
		
		if (obehs)
		{
			for (p in obehs)
			{
				if (obehs.hasOwnProperty(p))
				{
					behindex = this.getBehaviorIndexBySid(inst, parseInt(p, 10));
					
					if (behindex < 0)
						continue;		// must've gone missing
					
					inst.behavior_insts[behindex].loadFromJSON(obehs[p]);
				}
			}
		}
		
		// Load plugin own data
		if (o["data"])
			inst.loadFromJSON(o["data"]);
	};
	
	// Cordova loading utilities
	Runtime.prototype.fetchLocalFileViaCordova = function (filename, successCallback, errorCallback)
	{
		var path = cordova["file"]["applicationDirectory"] + "www/" + filename;
		
		window["resolveLocalFileSystemURL"](path, function (entry)
		{
			entry.file(successCallback, errorCallback);
		}, errorCallback);
	};
	
	Runtime.prototype.fetchLocalFileViaCordovaAsText = function (filename, successCallback, errorCallback)
	{
		this.fetchLocalFileViaCordova(filename, function (file)
		{
			var reader = new FileReader();
			
			reader.onload = function (e)
			{
				successCallback(e.target.result);
			};
			
			reader.onerror = errorCallback;
			reader.readAsText(file);
			
		}, errorCallback);
	};
	
	Runtime.prototype.fetchLocalFileViaCordovaAsArrayBuffer = function (filename, successCallback, errorCallback)
	{
		this.fetchLocalFileViaCordova(filename, function (file)
		{
			var reader = new FileReader();
			
			reader.onload = function (e)
			{
				successCallback(e.target.result);
			};
			
			reader.readAsArrayBuffer(file);
		}, errorCallback);
	};
	
	Runtime.prototype.fetchLocalFileViaCordovaAsURL = function (filename, successCallback, errorCallback)
	{
		// Convert fake Cordova file to a real Blob object, which we can create a URL to.
		this.fetchLocalFileViaCordovaAsArrayBuffer(filename, function (arrayBuffer)
		{
			var blob = new Blob([arrayBuffer]);
			var url = URL.createObjectURL(blob);
			successCallback(url);
		}, errorCallback);
	};
	
	Runtime.prototype.setImageSrc = function (img, src)
	{
		if (this.isWKWebView)
		{
			this.fetchLocalFileViaCordovaAsURL(src, function (url)
			{
				img.src = url;
			}, function (err)
			{
				alert("Failed to load image: " + err);
			});
		}
		else
		{
			img.src = src;
		}
	};
	
	cr.runtime = Runtime;
	
	cr.createRuntime = function (canvasid)
	{
		return new Runtime(document.getElementById(canvasid));
	};
	
	cr.createDCRuntime = function (w, h)
	{
		return new Runtime({ "dc": true, "width": w, "height": h });
	};
	
	window["cr_createRuntime"] = cr.createRuntime;
	window["cr_createDCRuntime"] = cr.createDCRuntime;
	
	window["createCocoonJSRuntime"] = function ()
	{
		window["c2cocoonjs"] = true;
		var canvas = document.createElement("screencanvas") || document.createElement("canvas");
		canvas.screencanvas = true;
		document.body.appendChild(canvas);
		
		var rt = new Runtime(canvas);
		window["c2runtime"] = rt;
		
		window.addEventListener("orientationchange", function () {
			window["c2runtime"]["setSize"](window.innerWidth, window.innerHeight);
		});
		
		window["c2runtime"]["setSize"](window.innerWidth, window.innerHeight);
		
		return rt;
	};
	
	window["createEjectaRuntime"] = function ()
	{
		var canvas = document.getElementById("canvas");
		var rt = new Runtime(canvas);
		window["c2runtime"] = rt;
		window["c2runtime"]["setSize"](window.innerWidth, window.innerHeight);
		return rt;
	};
	
}());

// External JS API from web page
window["cr_getC2Runtime"] = function()
{
	var canvas = document.getElementById("c2canvas");
	
	if (canvas)
		return canvas["c2runtime"];
	else if (window["c2runtime"])
		return window["c2runtime"];
	else
		return null;
}

window["cr_getSnapshot"] = function (format_, quality_)
{
	var runtime = window["cr_getC2Runtime"]();
	
	if (runtime)
		runtime.doCanvasSnapshot(format_, quality_);
}

window["cr_sizeCanvas"] = function(w, h)
{
	if (w === 0 || h === 0)
		return;
		
	var runtime = window["cr_getC2Runtime"]();
	
	if (runtime)
		runtime["setSize"](w, h);
}

window["cr_setSuspended"] = function(s)
{
	var runtime = window["cr_getC2Runtime"]();
	
	if (runtime)
		runtime["setSuspended"](s);
}