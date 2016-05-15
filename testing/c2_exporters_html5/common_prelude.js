// ECMAScript 5 strict mode
"use strict";

// Create the cr namespace for all runtime names
var cr = {};
cr.plugins_ = {};
cr.behaviors = {};

// Add Object.getPrototypeOf if missing (not in Opera)
if (typeof Object.getPrototypeOf !== "function")
{
	if (typeof "test".__proto__ === "object")
	{
		Object.getPrototypeOf = function(object) {
			return object.__proto__;
		};
	}
	else
	{
		Object.getPrototypeOf = function(object) {
			// May break if the constructor has been tampered with
			return object.constructor.prototype;
		};
	}
}

(function(){

	// Log something even after export, vs. the log() function which is stripped out when exporting
	cr.logexport = function (msg)
	{
		if (window.console && window.console.log)
			window.console.log(msg);
	};
	
	cr.logerror = function (msg)
	{
		if (window.console && window.console.error)
			window.console.error(msg);
	};
	
	// ECMAScript 5 helpers
	cr.seal = function(x)
	{
		// This just causes too big a perf hit on iOS
		// /**PREVIEWONLY**/ if (Object.seal) return Object.seal(x);
		
		return x;
	};
	
	cr.freeze = function(x)
	{
		// /**PREVIEWONLY**/ if (Object.freeze) return Object.freeze(x);
		
		return x;
	};
	
	cr.is_undefined = function (x)
	{
		return typeof x === "undefined";
	};
	
	cr.is_number = function (x)
	{
		return typeof x === "number";
	};
	
	cr.is_string = function (x)
	{
		return typeof x === "string";
	};
	
	cr.isPOT = function (x)
	{
		return x > 0 && ((x - 1) & x) === 0;
	};
	
	cr.nextHighestPowerOfTwo = function(x) {
		--x;
		for (var i = 1; i < 32; i <<= 1) {
			x = x | x >> i;
		}
		return x + 1;
	}
	
	cr.abs = function (x)
	{
		// Faster than Math.abs
		return (x < 0 ? -x : x);
	};
	
	cr.max = function (a, b)
	{
		// Faster than Math.max
		return (a > b ? a : b);
	};
	
	cr.min = function (a, b)
	{
		// Faster than Math.min
		return (a < b ? a : b);
	};
	
	cr.PI = Math.PI;
	
	cr.round = function (x)
	{
		// Faster than Math.round
		return (x + 0.5) | 0;
	};
	
	cr.floor = function (x)
	{
		if (x >= 0)
			return x | 0;
		else
			return (x | 0) - 1;		// correctly round down when negative
	};
	
	cr.ceil = function (x)
	{
		var f = x | 0;
		return (f === x ? f : f + 1);
	};
	
	// Vector types
	function Vector2(x, y)
	{
		this.x = x;
		this.y = y;
		cr.seal(this);
	};

	Vector2.prototype.offset = function (px, py)
	{
		this.x += px;
		this.y += py;
		return this;
	};
	
	Vector2.prototype.mul = function (px, py)
	{
		this.x *= px;
		this.y *= py;
		return this;
	};
	
	cr.vector2 = Vector2;

	// Segment intersection
	cr.segments_intersect = function(a1x, a1y, a2x, a2y, b1x, b1y, b2x, b2y)
	{
		var max_ax, min_ax, max_ay, min_ay, max_bx, min_bx, max_by, min_by;
		
		// Long-hand code since this is a performance hotspot and this type of
		// code minimises the number of conditional tests necessary.
		if (a1x < a2x)
		{
			min_ax = a1x;
			max_ax = a2x;
		}
		else
		{
			min_ax = a2x;
			max_ax = a1x;
		}
		
		if (b1x < b2x)
		{
			min_bx = b1x;
			max_bx = b2x;
		}
		else
		{
			min_bx = b2x;
			max_bx = b1x;
		}
		
		if (max_ax < min_bx || min_ax > max_bx)
			return false;
		
		if (a1y < a2y)
		{
			min_ay = a1y;
			max_ay = a2y;
		}
		else
		{
			min_ay = a2y;
			max_ay = a1y;
		}
		
		if (b1y < b2y)
		{
			min_by = b1y;
			max_by = b2y;
		}
		else
		{
			min_by = b2y;
			max_by = b1y;
		}
		
		if (max_ay < min_by || min_ay > max_by)
			return false;
			
		var dpx = b1x - a1x + b2x - a2x;
		var dpy = b1y - a1y + b2y - a2y;
		var qax = a2x - a1x;
		var qay = a2y - a1y;
		var qbx = b2x - b1x;
		var qby = b2y - b1y;

		var d = cr.abs(qay * qbx - qby * qax);
		var la = qbx * dpy - qby * dpx;
		
		if (cr.abs(la) > d)
			return false;
		
		var lb = qax * dpy - qay * dpx;
		
		return cr.abs(lb) <= d;
	};

	function Rect(left, top, right, bottom)
	{
		this.set(left, top, right, bottom);
		cr.seal(this);
	};
	
	Rect.prototype.set = function (left, top, right, bottom)
	{
		this.left = left;
		this.top = top;
		this.right = right;
		this.bottom = bottom;
	};
	
	Rect.prototype.copy = function (r)
	{
		this.left = r.left;
		this.top = r.top;
		this.right = r.right;
		this.bottom = r.bottom;
	};

	Rect.prototype.width = function ()
	{
		return this.right - this.left;
	};

	Rect.prototype.height = function ()
	{
		return this.bottom - this.top;
	};
	
	Rect.prototype.offset = function (px, py)
	{
		this.left += px;
		this.top += py;
		this.right += px;
		this.bottom += py;
		return this;
	};
	
	Rect.prototype.normalize = function ()
	{
		var temp = 0;
		
		if (this.left > this.right)
		{
			temp = this.left;
			this.left = this.right;
			this.right = temp;
		}
		
		if (this.top > this.bottom)
		{
			temp = this.top;
			this.top = this.bottom;
			this.bottom = temp;
		}
	};

	Rect.prototype.intersects_rect = function (rc)
	{
		return !(rc.right < this.left || rc.bottom < this.top || rc.left > this.right || rc.top > this.bottom);
	};
	
	Rect.prototype.intersects_rect_off = function (rc, ox, oy)
	{
		return !(rc.right + ox < this.left || rc.bottom + oy < this.top || rc.left + ox > this.right || rc.top + oy > this.bottom);
	};
	
	Rect.prototype.contains_pt = function (x, y)
	{
		return (x >= this.left && x <= this.right) && (y >= this.top && y <= this.bottom);
	};
	
	Rect.prototype.equals = function (r)
	{
		return this.left === r.left && this.top === r.top && this.right === r.right && this.bottom === r.bottom;
	};
	
	cr.rect = Rect;

	function Quad()
	{
		this.tlx = 0;
		this.tly = 0;
		this.trx = 0;
		this.try_ = 0;	// is a keyword otherwise!
		this.brx = 0;
		this.bry = 0;
		this.blx = 0;
		this.bly = 0;
		cr.seal(this);
	};
	
	Quad.prototype.set_from_rect = function (rc)
	{
		this.tlx = rc.left;
		this.tly = rc.top;
		this.trx = rc.right;
		this.try_ = rc.top;
		this.brx = rc.right;
		this.bry = rc.bottom;
		this.blx = rc.left;
		this.bly = rc.bottom;
	};
	
	Quad.prototype.set_from_rotated_rect = function (rc, a)
	{
		if (a === 0)
		{
			this.set_from_rect(rc);
		}
		else
		{
			var sin_a = Math.sin(a);
			var cos_a = Math.cos(a);

			var left_sin_a = rc.left * sin_a;
			var top_sin_a = rc.top * sin_a;
			var right_sin_a = rc.right * sin_a;
			var bottom_sin_a = rc.bottom * sin_a;

			var left_cos_a = rc.left * cos_a;
			var top_cos_a = rc.top * cos_a;
			var right_cos_a = rc.right * cos_a;
			var bottom_cos_a = rc.bottom * cos_a;
			
			this.tlx = left_cos_a - top_sin_a;
			this.tly = top_cos_a + left_sin_a;
			this.trx = right_cos_a - top_sin_a;
			this.try_ = top_cos_a + right_sin_a;
			this.brx = right_cos_a - bottom_sin_a;
			this.bry = bottom_cos_a + right_sin_a;
			this.blx = left_cos_a - bottom_sin_a;
			this.bly = bottom_cos_a + left_sin_a;
		}
	};

	Quad.prototype.offset = function (px, py)
	{
		this.tlx += px;
		this.tly += py;
		this.trx += px;
		this.try_ += py;
		this.brx += px;
		this.bry += py;
		this.blx += px;
		this.bly += py;
		return this;
	};
	
	var minresult = 0;
	var maxresult = 0;
	
	function minmax4(a, b, c, d)
	{
		if (a < b)
		{
			if (c < d)
			{
				// sort order: (a, c) (b, d)
				if (a < c)
					minresult = a;
				else
					minresult = c;
				
				if (b > d)
					maxresult = b;
				else
					maxresult = d;
			}
			else
			{
				// sort order: (a, d) (b, c)
				if (a < d)
					minresult = a;
				else
					minresult = d;
				
				if (b > c)
					maxresult = b;
				else
					maxresult = c;
			}
		}
		else
		{
			if (c < d)
			{
				// sort order: (b, c) (a, d)
				if (b < c)
					minresult = b;
				else
					minresult = c;
				
				if (a > d)
					maxresult = a;
				else
					maxresult = d;
			}
			else
			{
				// sort order: (b, d) (a, c)
				if (b < d)
					minresult = b;
				else
					minresult = d;
				
				if (a > c)
					maxresult = a;
				else
					maxresult = c;
			}
		}
	};

	Quad.prototype.bounding_box = function (rc)
	{
		minmax4(this.tlx, this.trx, this.brx, this.blx);
		rc.left = minresult;
		rc.right = maxresult;
		
		minmax4(this.tly, this.try_, this.bry, this.bly);
		rc.top = minresult;
		rc.bottom = maxresult;
	};

	Quad.prototype.contains_pt = function (x, y)
	{
		var tlx = this.tlx;
		var tly = this.tly;
		
		// p lies inside either triangles tl, tr, br or tl, bl, br
		var v0x = this.trx - tlx;
		var v0y = this.try_ - tly;
		var v1x = this.brx - tlx;
		var v1y = this.bry - tly;
		var v2x = x - tlx;
		var v2y = y - tly;

		var dot00 = v0x * v0x + v0y * v0y
		var dot01 = v0x * v1x + v0y * v1y
		var dot02 = v0x * v2x + v0y * v2y
		var dot11 = v1x * v1x + v1y * v1y
		var dot12 = v1x * v2x + v1y * v2y

		var invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
		var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
		var v = (dot00 * dot12 - dot01 * dot02) * invDenom;

		// Point is in first triangle
		if ((u >= 0.0) && (v > 0.0) && (u + v < 1))
			return true;

		// For second triangle, only v0 changes, so only recompute what that changes
		v0x = this.blx - tlx;
		v0y = this.bly - tly;

		var dot00 = v0x * v0x + v0y * v0y
		var dot01 = v0x * v1x + v0y * v1y
		var dot02 = v0x * v2x + v0y * v2y

		invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
		u = (dot11 * dot02 - dot01 * dot12) * invDenom;
		v = (dot00 * dot12 - dot01 * dot02) * invDenom;

		// Point is in second triangle
		return (u >= 0.0) && (v > 0.0) && (u + v < 1);
	};

	// Get point at index i (ordered: tl, tr, br, bl)
	Quad.prototype.at = function (i, xory)
	{
		// Returning X pos
		if (xory)
		{
			switch (i)
			{
				case 0: return this.tlx;
				case 1: return this.trx;
				case 2: return this.brx;
				case 3: return this.blx;
				case 4: return this.tlx;
				default: return this.tlx;
			}
		}
		// Returning Y pos
		else
		{
			switch (i)
			{
				case 0: return this.tly;
				case 1: return this.try_;
				case 2: return this.bry;
				case 3: return this.bly;
				case 4: return this.tly;
				default: return this.tly;
			}
		}
	};
	
	Quad.prototype.midX = function ()
	{
		return (this.tlx + this.trx  + this.brx + this.blx) / 4;
	};
	
	Quad.prototype.midY = function ()
	{
		return (this.tly + this.try_ + this.bry + this.bly) / 4;
	};

	Quad.prototype.intersects_segment = function (x1, y1, x2, y2)
	{
		// Contained segments count as intersecting
		if (this.contains_pt(x1, y1) || this.contains_pt(x2, y2))
			return true;
			
		var a1x, a1y, a2x, a2y;

		// Otherwise check all 4 combinations of segment intersects
		var i;
		for (i = 0; i < 4; i++)
		{
			a1x = this.at(i, true);
			a1y = this.at(i, false);
			a2x = this.at(i + 1, true);
			a2y = this.at(i + 1, false);
			
			if (cr.segments_intersect(x1, y1, x2, y2, a1x, a1y, a2x, a2y))
				return true;
		}
		
		return false;
	};
	
	Quad.prototype.intersects_quad = function (rhs)
	{
		// If rhs is completely contained by this quad, none of its segments intersect, but its
		// mid point will be inside this quad.  Test for this first.
		var midx = rhs.midX();
		var midy = rhs.midY();
								
		if (this.contains_pt(midx, midy))
			return true;

		// Alternatively rhs may completely contain this quad
		midx = this.midX();
		midy = this.midY();
		
		if (rhs.contains_pt(midx, midy))
			return true;
			
		var a1x, a1y, a2x, a2y, b1x, b1y, b2x, b2y;

		// Otherwise check all 16 combinations of segment intersects
		var i, j;
		for (i = 0; i < 4; i++)
		{
			for (j = 0; j < 4; j++)
			{
				a1x = this.at(i, true);
				a1y = this.at(i, false);
				a2x = this.at(i + 1, true);
				a2y = this.at(i + 1, false);
				b1x = rhs.at(j, true);
				b1y = rhs.at(j, false);
				b2x = rhs.at(j + 1, true);
				b2y = rhs.at(j + 1, false);
				
				if (cr.segments_intersect(a1x, a1y, a2x, a2y, b1x, b1y, b2x, b2y))
					return true;
			}
		}

		return false;
	};
	
	cr.quad = Quad;
	
	// Return red, green and blue values in COLORREF format
	cr.RGB = function (red, green, blue)
	{
		return Math.max(Math.min(red, 255), 0)
			 | (Math.max(Math.min(green, 255), 0) << 8)
			 | (Math.max(Math.min(blue, 255), 0) << 16);
	};
	
	cr.GetRValue = function (rgb)
	{
		return rgb & 0xFF;
	};
	
	cr.GetGValue = function (rgb)
	{
		return (rgb & 0xFF00) >> 8;
	};
	
	cr.GetBValue = function (rgb)
	{
		return (rgb & 0xFF0000) >> 16;
	};

	// Merge attributes of b in to a, where a does not have an attribute in b.
	// Does not overwrite attributes in a; this is considered an error case (unless allowOverwrite is true)
	cr.shallowCopy = function (a, b, allowOverwrite)
	{
		var attr;
		for (attr in b)
		{
			if (b.hasOwnProperty(attr))
			{
				assert2(allowOverwrite || cr.is_undefined(a[attr]), "shallowCopy() overwriting property '" + attr + "', is this intended?");

				a[attr] = b[attr];
			}
		}
		
		return a;
	};

	// Remove item at integer index from arr
	cr.arrayRemove = function (arr, index)
	{
		var i, len;
		index = cr.floor(index);
		
		if (index < 0 || index >= arr.length)
			return;							// index out of bounds

		for (i = index, len = arr.length - 1; i < len; i++)
			arr[i] = arr[i + 1];
			
		cr.truncateArray(arr, len);
	};
	
	cr.truncateArray = function (arr, index)
	{
		//arr.splice(index);
		arr.length = index;
	};
	
	cr.clearArray = function (arr)
	{
		cr.truncateArray(arr, 0);
	};
	
	// Make array 'dest' look the same as 'src' (make same length and shallow copy contents)
	// Can help avoid garbage created by slice(0)
	cr.shallowAssignArray = function (dest, src)
	{
		cr.clearArray(dest);
		
		var i, len;
		for (i = 0, len = src.length; i < len; ++i)
			dest[i] = src[i];
	};
	
	// Append the whole of b to the end of a
	cr.appendArray = function (a, b)
	{
		a.push.apply(a, b);
	};
	
	cr.fastIndexOf = function (arr, item)
	{
		// faster in JS land
		var i, len;
		for (i = 0, len = arr.length; i < len; ++i)
		{
			if (arr[i] === item)
				return i;
		}
		
		return -1;
	};

	// Find the object 'item' in arr and remove it
	cr.arrayFindRemove = function (arr, item)
	{
		var index = cr.fastIndexOf(arr, item);
		
		if (index !== -1)
			cr.arrayRemove(arr, index);
	};

	// Helpers
	cr.clamp = function(x, a, b)
	{
		if (x < a)
			return a;
		else if (x > b)
			return b;
		else
			return x;
	};

	cr.to_radians = function(x)
	{
		return x / (180.0 / cr.PI);
	};

	cr.to_degrees = function(x)
	{
		return x * (180.0 / cr.PI);
	};

	cr.clamp_angle_degrees = function (a)
	{
		// Clamp in degrees
		a %= 360;       // now in (-360, 360) range

		if (a < 0)
			a += 360;   // now in [0, 360) range

		return a;
	};

	cr.clamp_angle = function (a)
	{
		// Clamp in radians
		a %= 2 * cr.PI;       // now in (-2pi, 2pi) range

		if (a < 0)
			a += 2 * cr.PI;   // now in [0, 2pi) range

		return a;
	};

	cr.to_clamped_degrees = function (x)
	{
		// Convert x from radians to [0, 360) range
		return cr.clamp_angle_degrees(cr.to_degrees(x));
	};

	cr.to_clamped_radians = function (x)
	{
		// Convert x from radians to [0, 2pi) range
		return cr.clamp_angle(cr.to_radians(x));
	};
	
	cr.angleTo = function(x1, y1, x2, y2)
	{
		var dx = x2 - x1;
        var dy = y2 - y1;
		return Math.atan2(dy, dx);
	};

	cr.angleDiff = function (a1, a2)
	{
		if (a1 === a2)
			return 0;

		var s1 = Math.sin(a1);
		var c1 = Math.cos(a1);
		var s2 = Math.sin(a2);
		var c2 = Math.cos(a2);
		var n = s1 * s2 + c1 * c2;
		
		// Prevent NaN results
		if (n >= 1)
			return 0;
		if (n <= -1)
			return cr.PI;
			
		return Math.acos(n);
	};

	cr.angleRotate = function (start, end, step)
	{
		var ss = Math.sin(start);
		var cs = Math.cos(start);
		var se = Math.sin(end);
		var ce = Math.cos(end);

		if (Math.acos(ss * se + cs * ce) > step)
		{
			if (cs * se - ss * ce > 0)
				return cr.clamp_angle(start + step);
			else
				return cr.clamp_angle(start - step);
		}
		else
			return cr.clamp_angle(end);
	};

	// test if a1 is clockwise of a2
	cr.angleClockwise = function (a1, a2)
	{
		var s1 = Math.sin(a1);
		var c1 = Math.cos(a1);
		var s2 = Math.sin(a2);
		var c2 = Math.cos(a2);
		return c1 * s2 - s1 * c2 <= 0;
	};
	
	cr.rotatePtAround = function (px, py, a, ox, oy, getx)
	{
		if (a === 0)
			return getx ? px : py;
		
		var sin_a = Math.sin(a);
		var cos_a = Math.cos(a);
		
		px -= ox;
		py -= oy;

		var left_sin_a = px * sin_a;
		var top_sin_a = py * sin_a;
		var left_cos_a = px * cos_a;
		var top_cos_a = py * cos_a;
		
		px = left_cos_a - top_sin_a;
		py = top_cos_a + left_sin_a;
		
		px += ox;
		py += oy;
		
		return getx ? px : py;
	}
	
	cr.distanceTo = function(x1, y1, x2, y2)
	{
		var dx = x2 - x1;
        var dy = y2 - y1;
		return Math.sqrt(dx*dx + dy*dy);
	};

	cr.xor = function (x, y)
	{
		return !x !== !y;
	};
	
	cr.lerp = function (a, b, x)
	{
		return a + (b - a) * x;
	};
	
	cr.unlerp = function (a, b, c)
	{
		if (a === b)
			return 0;		// avoid divide by 0
		
		return (c - a) / (b - a);
	};
	
	cr.anglelerp = function (a, b, x)
	{
		var diff = cr.angleDiff(a, b);
		
		// b clockwise from a
		if (cr.angleClockwise(b, a))
		{
			return a + diff * x;
		}
		else
		{
			return a - diff * x;
		}
	};
	
	cr.qarp = function (a, b, c, x)
	{
		return cr.lerp(cr.lerp(a, b, x), cr.lerp(b, c, x), x);
	};
	
	cr.cubic = function (a, b, c, d, x)
	{
		return cr.lerp(cr.qarp(a, b, c, x), cr.qarp(b, c, d, x), x);
	};
	
	cr.cosp = function (a, b, x)
	{
		return (a + b + (a - b) * Math.cos(x * Math.PI)) / 2;
	};
	
	cr.hasAnyOwnProperty = function (o)
	{
		var p;
		for (p in o)
		{
			if (o.hasOwnProperty(p))
				return true;
		}
		
		return false;
	};
	
	// remove all own properties on obj, effectively reverting it to a new object
	// use with care! probably reverts object to dictionary mode which is slower
	cr.wipe = function (obj)
	{
		var p;
		for (p in obj)
		{
			if (obj.hasOwnProperty(p))
				delete obj[p];
		}
	};
	
	var startup_time = +(new Date());
	
	cr.performance_now = function()
	{
		if (typeof window["performance"] !== "undefined")
		{
			var winperf = window["performance"];
			
			if (typeof winperf.now !== "undefined")
				return winperf.now();
			else if (typeof winperf["webkitNow"] !== "undefined")
				return winperf["webkitNow"]();
			else if (typeof winperf["mozNow"] !== "undefined")
				return winperf["mozNow"]();
			else if (typeof winperf["msNow"] !== "undefined")
				return winperf["msNow"]();
		}
		
		return Date.now() - startup_time;
	};
	
	var isChrome = false;
	var isSafari = false;
	var isiOS = false;
	var isEjecta = false;
	
	if (typeof window !== "undefined")		// not c2 editor
	{
		isChrome = /chrome/i.test(navigator.userAgent) || /chromium/i.test(navigator.userAgent);
		isSafari = !isChrome && /safari/i.test(navigator.userAgent);
		isiOS = /(iphone|ipod|ipad)/i.test(navigator.userAgent);
		isEjecta = window["c2ejecta"];
	}
	
	// Ejecta/Safari ship a broken Set, so avoid using it on those platforms
	var supports_set = ((!isSafari && !isEjecta && !isiOS) && (typeof Set !== "undefined" && typeof Set.prototype["forEach"] !== "undefined"));

	// Set of objects.  Requires a .toString() overload to distinguish objects where Set is not supported.
	function ObjectSet_()
	{
		this.s = null;
		this.items = null;			// lazy allocated (hopefully results in better GC performance)
		this.item_count = 0;
		
		if (supports_set)
		{
			this.s = new Set();
		}

		// Caches its items as an array for fast repeated calls to .valuesRef()
		this.values_cache = [];
		this.cache_valid = true;
		
		cr.seal(this);
	};

	ObjectSet_.prototype.contains = function (x)
	{
		if (this.isEmpty())
			return false;
		
		if (supports_set)
			return this.s["has"](x);
		else
			return (this.items && this.items.hasOwnProperty(x));
	};

	ObjectSet_.prototype.add = function (x)
	{
		if (supports_set)
		{
			if (!this.s["has"](x))
			{
				this.s["add"](x);
				this.cache_valid = false;
			}
		}
		else
		{
			var str = x.toString();
			var items = this.items;
			
			// not yet created 'items': create it and add one item
			if (!items)
			{
				this.items = {};
				this.items[str] = x;
				this.item_count = 1;
				this.cache_valid = false;
			}
			// already created 'items': add if not already added
			// don't use contains(), it would call toString() again
			else if (!items.hasOwnProperty(str))
			{
				items[str] = x;
				this.item_count++;
				this.cache_valid = false;
			}
		}
	};

	ObjectSet_.prototype.remove = function (x)
	{
		if (this.isEmpty())
			return;
		
		if (supports_set)
		{
			if (this.s["has"](x))
			{
				this.s["delete"](x);
				this.cache_valid = false;
			}
		}
		else if (this.items)
		{
			var str = x.toString();
			var items = this.items;
			
			if (items.hasOwnProperty(str))
			{
				delete items[str];
				this.item_count--;
				this.cache_valid = false;
			}
		}
	};

	ObjectSet_.prototype.clear = function (/*wipe_*/)
	{
		if (this.isEmpty())
			return;
		
		if (supports_set)
		{
			this.s["clear"]();			// best!
		}
		else
		{
			//if (wipe_)
			//	cr.wipe(this.items);	// is slower
			//else
				this.items = null;		// creates garbage; will lazy allocate on next add()
			
			this.item_count = 0;
		}

		// Reset cache to known empty state
		cr.clearArray(this.values_cache);
		this.cache_valid = true;
	};

	ObjectSet_.prototype.isEmpty = function ()
	{
		return this.count() === 0;
	};

	ObjectSet_.prototype.count = function ()
	{
		if (supports_set)
			return this.s["size"];
		else
			return this.item_count;
	};
	
	var current_arr = null;
	var current_index = 0;
	
	function set_append_to_arr(x)
	{
		current_arr[current_index++] = x;
	};
	
	ObjectSet_.prototype.update_cache = function ()
	{
		if (this.cache_valid)
			return;

		if (supports_set)
		{
			cr.clearArray(this.values_cache);
			
			current_arr = this.values_cache;
			current_index = 0;
			
			this.s["forEach"](set_append_to_arr);
			
			assert2(current_index === this.s["size"], "ObjectSet cache mismatch: " + current_index + " iterations for set size " + this.s["size"]);
			
			current_arr = null;
			current_index = 0;
		}
		else
		{
			var values_cache = this.values_cache;
			cr.clearArray(values_cache);
			var p, n = 0, items = this.items;
		
			if (items)
			{
				for (p in items)
				{
					if (items.hasOwnProperty(p))
						values_cache[n++] = items[p];
				}
			}
			
			assert2(n === this.item_count, "ObjectSet cache mismatch");
		}
		
		// Cache now up to date
		this.cache_valid = true;
	};
	
	ObjectSet_.prototype.valuesRef = function ()
	{
		this.update_cache();
		
		// Return reference to the cache
		return this.values_cache;
	};
	
	cr.ObjectSet = ObjectSet_;
	
	// Remove all duplicates from an array
	var tmpSet = new cr.ObjectSet();
	
	cr.removeArrayDuplicates = function (arr)
	{
		var i, len;
		for (i = 0, len = arr.length; i < len; ++i)
		{
			tmpSet.add(arr[i]);
		}
		
		cr.shallowAssignArray(arr, tmpSet.valuesRef());
		tmpSet.clear();
	};

	// Remove every item in an ObjectSet 'remset' from 'arr'.
	// Avoids repeated expensive calls to remove one item at a time.
	cr.arrayRemoveAllFromObjectSet = function (arr, remset)
	{
		if (supports_set)
			cr.arrayRemoveAll_set(arr, remset.s);
		else
			cr.arrayRemoveAll_arr(arr, remset.valuesRef());
	};
	
	cr.arrayRemoveAll_set = function (arr, s)
	{
		var i, j, len, item;
		
		for (i = 0, j = 0, len = arr.length; i < len; ++i)
		{
			item = arr[i];
			
			if (!s["has"](item))					// not an item to remove
				arr[j++] = item;					// keep it
		}
		
		cr.truncateArray(arr, j);
	};
	
	cr.arrayRemoveAll_arr = function (arr, rem)
	{
		var i, j, len, item;
		
		for (i = 0, j = 0, len = arr.length; i < len; ++i)
		{
			item = arr[i];
			
			if (cr.fastIndexOf(rem, item) === -1)	// not an item to remove
				arr[j++] = item;					// keep it
		}
		
		cr.truncateArray(arr, j);
	};
	

    // Kahan adder.  At the mercy of optimising javascript engines which may wipe out its effect entirely
    // - hopefully they use the equivalent of precise mode.
	function KahanAdder_()
	{
		this.c = 0;
        this.y = 0;
        this.t = 0;
        this.sum = 0;
		cr.seal(this);
	};

	KahanAdder_.prototype.add = function (v)
	{
		this.y = v - this.c;
	    this.t = this.sum + this.y;
	    this.c = (this.t - this.sum) - this.y;
	    this.sum = this.t;
	};

    KahanAdder_.prototype.reset = function ()
    {
        this.c = 0;
        this.y = 0;
        this.t = 0;
        this.sum = 0;
    };
	
	cr.KahanAdder = KahanAdder_;
	
	cr.regexp_escape = function(text)
	{
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	};
	
	// Collision polys
	function CollisionPoly_(pts_array_)
	{
		this.pts_cache = [];
		this.bboxLeft = 0;
		this.bboxTop = 0;
		this.bboxRight = 0;
		this.bboxBottom = 0;
		this.convexpolys = null;		// for physics behavior to cache separated polys
		this.set_pts(pts_array_);
		cr.seal(this);
	};
	
	CollisionPoly_.prototype.set_pts = function(pts_array_)
	{
		this.pts_array = pts_array_;
		this.pts_count = pts_array_.length / 2;			// x, y, x, y... in array
		this.pts_cache.length = pts_array_.length;
		
		// invalidate cache
		this.cache_width = -1;
		this.cache_height = -1;
		this.cache_angle = 0;
	};
	
	CollisionPoly_.prototype.is_empty = function()
	{
		return !this.pts_array.length;
	};
	
	CollisionPoly_.prototype.update_bbox = function ()
	{
		var myptscache = this.pts_cache;
		
		var bboxLeft_ = myptscache[0];
		var bboxRight_ = bboxLeft_;
		var bboxTop_ = myptscache[1];
		var bboxBottom_ = bboxTop_;
		
		var x, y, i = 1, i2, len = this.pts_count;
		
		for ( ; i < len; ++i)
		{
			i2 = i*2;
			x = myptscache[i2];
			y = myptscache[i2+1];
			
			if (x < bboxLeft_)
				bboxLeft_ = x;
			if (x > bboxRight_)
				bboxRight_ = x;
			if (y < bboxTop_)
				bboxTop_ = y;
			if (y > bboxBottom_)
				bboxBottom_ = y;
		}
		
		this.bboxLeft = bboxLeft_;
		this.bboxRight = bboxRight_;
		this.bboxTop = bboxTop_;
		this.bboxBottom = bboxBottom_;
	};
	
	CollisionPoly_.prototype.set_from_rect = function(rc, offx, offy)
	{
		this.pts_cache.length = 8;
		this.pts_count = 4;
		var myptscache = this.pts_cache;
		myptscache[0] = rc.left - offx;
		myptscache[1] = rc.top - offy;
		myptscache[2] = rc.right - offx;
		myptscache[3] = rc.top - offy;
		myptscache[4] = rc.right - offx;
		myptscache[5] = rc.bottom - offy;
		myptscache[6] = rc.left - offx;
		myptscache[7] = rc.bottom - offy;
		this.cache_width = rc.right - rc.left;
		this.cache_height = rc.bottom - rc.top;
		this.update_bbox();
	};
	
	CollisionPoly_.prototype.set_from_quad = function(q, offx, offy, w, h)
	{
		this.pts_cache.length = 8;
		this.pts_count = 4;
		var myptscache = this.pts_cache;
		myptscache[0] = q.tlx - offx;
		myptscache[1] = q.tly - offy;
		myptscache[2] = q.trx - offx;
		myptscache[3] = q.try_ - offy;
		myptscache[4] = q.brx - offx;
		myptscache[5] = q.bry - offy;
		myptscache[6] = q.blx - offx;
		myptscache[7] = q.bly - offy;
		this.cache_width = w;
		this.cache_height = h;
		this.update_bbox();
	};
	
	CollisionPoly_.prototype.set_from_poly = function (r)
	{
		this.pts_count = r.pts_count;
		cr.shallowAssignArray(this.pts_cache, r.pts_cache);
		this.bboxLeft = r.bboxLeft;
		this.bboxTop - r.bboxTop;
		this.bboxRight = r.bboxRight;
		this.bboxBottom = r.bboxBottom;
	};
	
	CollisionPoly_.prototype.cache_poly = function(w, h, a)
	{
		if (this.cache_width === w && this.cache_height === h && this.cache_angle === a)
			return;		// cache up-to-date
			
		// Set the points cache to the scaled and rotated poly
		this.cache_width = w;
		this.cache_height = h;
		this.cache_angle = a;
		
		var i, i2, i21, len, x, y;
		var sina = 0;
		var cosa = 1;
		var myptsarray = this.pts_array;
		var myptscache = this.pts_cache;
		
		if (a !== 0)
		{
			sina = Math.sin(a);
			cosa = Math.cos(a);
		}
		
		for (i = 0, len = this.pts_count; i < len; i++)
		{
			// get scaled
			i2 = i*2;
			i21 = i2+1;
			x = myptsarray[i2] * w;
			y = myptsarray[i21] * h;
			
			// rotate by angle and save in cache
			myptscache[i2] = (x * cosa) - (y * sina);
			myptscache[i21] = (y * cosa) + (x * sina);
		}
		
		this.update_bbox();
	};
	
	// (px, py) is relative to polygon origin.  Poly must be cached beforehand.
	CollisionPoly_.prototype.contains_pt = function (a2x, a2y)
	{
		var myptscache = this.pts_cache;
		
		// Special case: first point is always contained (so exactly overlapping identical polys register collision)
		if (a2x === myptscache[0] && a2y === myptscache[1])
			return true;
		
		// Determine start coordinates outside of poly.
		// Test 2 different start coordinates to ensure segments passing exactly
		// through vertices don't give false negatives.
		// Also to guarantee the start points are outside of this poly, take the
		// poly's bounding box and set the positions outside of that box.
		var i, i2, imod, len = this.pts_count;
		
		var a1x = this.bboxLeft - 110;
		var a1y = this.bboxTop - 101;
		var a3x = this.bboxRight + 131
		var a3y = this.bboxBottom + 120;
		var b1x, b1y, b2x, b2y;
		
		// count segments intersecting from given start points
		var count1 = 0, count2 = 0;
		
		for (i = 0; i < len; i++)
		{
			i2 = i*2;
			imod = ((i+1)%len)*2;
			b1x = myptscache[i2];
			b1y = myptscache[i2+1];
			b2x = myptscache[imod];
			b2y = myptscache[imod+1];
			
			if (cr.segments_intersect(a1x, a1y, a2x, a2y, b1x, b1y, b2x, b2y))
				count1++;
			if (cr.segments_intersect(a3x, a3y, a2x, a2y, b1x, b1y, b2x, b2y))
				count2++;
		}
		
		// In theory both counts should always be even or odd at the same time.
		// However, if one of the segments passes exactly through a vertex then the count will incorrectly be even.
		// In that case the other line should still have an odd count.  Therefore, return
		// true if either count was odd.
		return (count1 % 2 === 1) || (count2 % 2 === 1);
	};
	
	CollisionPoly_.prototype.intersects_poly = function (rhs, offx, offy)
	{
		var rhspts = rhs.pts_cache;
		var mypts = this.pts_cache;
		
		// Determine if this contains rhs
		if (this.contains_pt(rhspts[0] + offx, rhspts[1] + offy))
			return true;
		// Determine if rhs contains this
		if (rhs.contains_pt(mypts[0] - offx, mypts[1] - offy))
			return true;
			
		// Check all combinations of segment intersection
		// TODO: could be faster with a sweep
		var i, i2, imod, leni, j, j2, jmod, lenj;
		var a1x, a1y, a2x, a2y, b1x, b1y, b2x, b2y;
		
		for (i = 0, leni = this.pts_count; i < leni; i++)
		{
			i2 = i*2;
			imod = ((i+1)%leni)*2;
			a1x = mypts[i2];
			a1y = mypts[i2+1];
			a2x = mypts[imod];
			a2y = mypts[imod+1];
			
			for (j = 0, lenj = rhs.pts_count; j < lenj; j++)
			{
				j2 = j*2;
				jmod = ((j+1)%lenj)*2;
				b1x = rhspts[j2] + offx;
				b1y = rhspts[j2+1] + offy;
				b2x = rhspts[jmod] + offx;
				b2y = rhspts[jmod+1] + offy;
				
				if (cr.segments_intersect(a1x, a1y, a2x, a2y, b1x, b1y, b2x, b2y))
					return true;
			}
		}
		
		return false;
	};
	
	CollisionPoly_.prototype.intersects_segment = function (offx, offy, x1, y1, x2, y2)
	{
		var mypts = this.pts_cache;
		
		// Determine if this contains either end of the segment
		if (this.contains_pt(x1 - offx, y1 - offy))
			return true;
			
		// Check all combinations of segment intersection
		var i, leni, i2, imod;
		var a1x, a1y, a2x, a2y;
		
		for (i = 0, leni = this.pts_count; i < leni; i++)
		{
			i2 = i*2;
			imod = ((i+1)%leni)*2;
			a1x = mypts[i2] + offx;
			a1y = mypts[i2+1] + offy;
			a2x = mypts[imod] + offx;
			a2y = mypts[imod+1] + offy;
			
			if (cr.segments_intersect(x1, y1, x2, y2, a1x, a1y, a2x, a2y))
				return true;
		}
		
		return false;
	};
	
	CollisionPoly_.prototype.mirror = function (px)
	{
		var i, leni, i2;
		for (i = 0, leni = this.pts_count; i < leni; ++i)
		{
			i2 = i*2;
			this.pts_cache[i2] = px * 2 - this.pts_cache[i2];
		}
	};
	
	CollisionPoly_.prototype.flip = function (py)
	{
		var i, leni, i21;
		for (i = 0, leni = this.pts_count; i < leni; ++i)
		{
			i21 = i*2+1;
			this.pts_cache[i21] = py * 2 - this.pts_cache[i21];
		}
	};
	
	CollisionPoly_.prototype.diag = function ()
	{
		var i, leni, i2, i21, temp;
		for (i = 0, leni = this.pts_count; i < leni; ++i)
		{
			i2 = i*2;
			i21 = i2+1;
			temp = this.pts_cache[i2];
			this.pts_cache[i2] = this.pts_cache[i21];
			this.pts_cache[i21] = temp;
		}
	};
	
	cr.CollisionPoly = CollisionPoly_;
	
	function SparseGrid_(cellwidth_, cellheight_)
	{
		this.cellwidth = cellwidth_;
		this.cellheight = cellheight_;
		
		// Using string properties derived from numbers to store if a grid cell
		// is present, e.g. this.cells["-6"]["4"]
		this.cells = {};
	};
	
	SparseGrid_.prototype.totalCellCount = 0;
	
	SparseGrid_.prototype.getCell = function (x_, y_, create_if_missing)
	{
		var ret;
		var col = this.cells[x_];
		
		if (!col)
		{
			if (create_if_missing)
			{
				ret = allocGridCell(this, x_, y_);
				this.cells[x_] = {};
				this.cells[x_][y_] = ret;
				return ret;
			}
			else
				return null;
		}
		
		ret = col[y_];
		
		if (ret)
			return ret;
		else if (create_if_missing)
		{
			ret = allocGridCell(this, x_, y_);
			this.cells[x_][y_] = ret;
			return ret;
		}
		else
			return null;
	};
	
	SparseGrid_.prototype.XToCell = function (x_)
	{
		return cr.floor(x_ / this.cellwidth);
	};
	
	SparseGrid_.prototype.YToCell = function (y_)
	{
		return cr.floor(y_ / this.cellheight);
	};
	
	SparseGrid_.prototype.update = function (inst, oldrange, newrange)
	{
		var x, lenx, y, leny, cell;
		
		// If no old range provided, must be new object, so just insert it across
		// the new range.
		if (oldrange)
		{
			// Iterate old range removing this instance (where old range does not overlap new range)
			// Note ranges are inclusive!
			for (x = oldrange.left, lenx = oldrange.right; x <= lenx; ++x)
			{
				for (y = oldrange.top, leny = oldrange.bottom; y <= leny; ++y)
				{
					if (newrange && newrange.contains_pt(x, y))
						continue;	// is still in this cell
					
					cell = this.getCell(x, y, false);	// don't create if missing
					
					if (!cell)
						continue;	// cell does not exist yet
					
					cell.remove(inst);
					
					// recycle the cell if it's now empty
					if (cell.isEmpty())
					{
						freeGridCell(cell);
						this.cells[x][y] = null;
					}
				}
			}
		}
		
		// If no new range provided, must be being destroyed, so remove across the old range.
		if (newrange)
		{
			// Iterate the new range inserting this instance (where new range does not
			// overlap old range)
			for (x = newrange.left, lenx = newrange.right; x <= lenx; ++x)
			{
				for (y = newrange.top, leny = newrange.bottom; y <= leny; ++y)
				{
					if (oldrange && oldrange.contains_pt(x, y))
						continue;	// is still in this cell
					
					// create the cell if missing and insert the object.
					// note if already in the cell, does nothing.
					this.getCell(x, y, true).insert(inst);
				}
			}
		}
	};
	
	SparseGrid_.prototype.queryRange = function (rc, result)
	{
		var x, lenx, ystart, y, leny, cell;
		
		x = this.XToCell(rc.left);
		ystart = this.YToCell(rc.top);
		lenx = this.XToCell(rc.right);
		leny = this.YToCell(rc.bottom);
		
		for ( ; x <= lenx; ++x)
		{
			for (y = ystart; y <= leny; ++y)
			{
				cell = this.getCell(x, y, false);
				
				if (!cell)
					continue;
				
				cell.dump(result);
			}
		}
	};
	
	cr.SparseGrid = SparseGrid_;
	
	function RenderGrid_(cellwidth_, cellheight_)
	{
		this.cellwidth = cellwidth_;
		this.cellheight = cellheight_;
		
		// Using string properties derived from numbers to store if a grid cell
		// is present, e.g. this.cells["-6"]["4"]
		this.cells = {};
	};
	
	RenderGrid_.prototype.totalCellCount = 0;
	
	RenderGrid_.prototype.getCell = function (x_, y_, create_if_missing)
	{
		var ret;
		var col = this.cells[x_];
		
		if (!col)
		{
			if (create_if_missing)
			{
				ret = allocRenderCell(this, x_, y_);
				this.cells[x_] = {};
				this.cells[x_][y_] = ret;
				return ret;
			}
			else
				return null;
		}
		
		ret = col[y_];
		
		if (ret)
			return ret;
		else if (create_if_missing)
		{
			ret = allocRenderCell(this, x_, y_);
			this.cells[x_][y_] = ret;
			return ret;
		}
		else
			return null;
	};
	
	RenderGrid_.prototype.XToCell = function (x_)
	{
		return cr.floor(x_ / this.cellwidth);
	};
	
	RenderGrid_.prototype.YToCell = function (y_)
	{
		return cr.floor(y_ / this.cellheight);
	};
	
	RenderGrid_.prototype.update = function (inst, oldrange, newrange)
	{
		var x, lenx, y, leny, cell;
		
		// If no old range provided, must be new object, so just insert it across
		// the new range.
		if (oldrange)
		{
			// Iterate old range removing this instance (where old range does not overlap new range)
			// Note ranges are inclusive!
			for (x = oldrange.left, lenx = oldrange.right; x <= lenx; ++x)
			{
				for (y = oldrange.top, leny = oldrange.bottom; y <= leny; ++y)
				{
					if (newrange && newrange.contains_pt(x, y))
						continue;	// is still in this cell
					
					cell = this.getCell(x, y, false);	// don't create if missing
					
					if (!cell)
						continue;	// cell does not exist yet
					
					cell.remove(inst);
					
					// recycle the cell if it's now empty
					if (cell.isEmpty())
					{
						freeRenderCell(cell);
						this.cells[x][y] = null;
					}
				}
			}
		}
		
		// If no new range provided, must be being destroyed, so remove across the old range.
		if (newrange)
		{
			// Iterate the new range inserting this instance (where new range does not
			// overlap old range)
			for (x = newrange.left, lenx = newrange.right; x <= lenx; ++x)
			{
				for (y = newrange.top, leny = newrange.bottom; y <= leny; ++y)
				{
					if (oldrange && oldrange.contains_pt(x, y))
						continue;	// is still in this cell
					
					// create the cell if missing and insert the object.
					// note if already in the cell, does nothing.
					this.getCell(x, y, true).insert(inst);
				}
			}
		}
	};
	
	RenderGrid_.prototype.queryRange = function (left, top, right, bottom, result)
	{
		var x, lenx, ystart, y, leny, cell;
		
		x = this.XToCell(left);
		ystart = this.YToCell(top);
		lenx = this.XToCell(right);
		leny = this.YToCell(bottom);
		
		for ( ; x <= lenx; ++x)
		{
			for (y = ystart; y <= leny; ++y)
			{
				cell = this.getCell(x, y, false);
				
				if (!cell)
					continue;
				
				cell.dump(result);
			}
		}
	};
	
	RenderGrid_.prototype.markRangeChanged = function (rc)
	{
		var x, lenx, ystart, y, leny, cell;
		
		x = rc.left;
		ystart = rc.top;
		lenx = rc.right;
		leny = rc.bottom;
		
		for ( ; x <= lenx; ++x)
		{
			for (y = ystart; y <= leny; ++y)
			{
				cell = this.getCell(x, y, false);
				
				if (!cell)
					continue;
				
				cell.is_sorted = false;
			}
		}
	};
	
	cr.RenderGrid = RenderGrid_;
	
	var gridcellcache = [];
	
	function allocGridCell(grid_, x_, y_)
	{
		var ret;
		
		SparseGrid_.prototype.totalCellCount++;
		
		if (gridcellcache.length)
		{
			ret = gridcellcache.pop();
			ret.grid = grid_;
			ret.x = x_;
			ret.y = y_;
			return ret;
		}
		else
			return new cr.GridCell(grid_, x_, y_);
	};
	
	function freeGridCell(c)
	{
		SparseGrid_.prototype.totalCellCount--;
		
		c.objects.clear();
		
		if (gridcellcache.length < 1000)
			gridcellcache.push(c);
	};
	
	function GridCell_(grid_, x_, y_)
	{
		this.grid = grid_;
		this.x = x_;
		this.y = y_;
		this.objects = new cr.ObjectSet();
	};
	
	GridCell_.prototype.isEmpty = function ()
	{
		return this.objects.isEmpty();
	};
	
	GridCell_.prototype.insert = function (inst)
	{
		this.objects.add(inst);
	};
	
	GridCell_.prototype.remove = function (inst)
	{
		this.objects.remove(inst);
	};
	
	GridCell_.prototype.dump = function (result)
	{
		cr.appendArray(result, this.objects.valuesRef());
	};
	
	cr.GridCell = GridCell_;
	
	var rendercellcache = [];
	
	function allocRenderCell(grid_, x_, y_)
	{
		var ret;
		
		RenderGrid_.prototype.totalCellCount++;
		
		if (rendercellcache.length)
		{
			ret = rendercellcache.pop();
			ret.grid = grid_;
			ret.x = x_;
			ret.y = y_;
			return ret;
		}
		else
			return new cr.RenderCell(grid_, x_, y_);
	};
	
	function freeRenderCell(c)
	{
		RenderGrid_.prototype.totalCellCount--;
		
		c.reset();
		
		if (rendercellcache.length < 1000)
			rendercellcache.push(c);
	};
	
	function RenderCell_(grid_, x_, y_)
	{
		this.grid = grid_;
		this.x = x_;
		this.y = y_;
		this.objects = [];		// array which needs to be sorted by Z order
		this.is_sorted = true;	// whether array is in correct sort order or not
		
		// instances pending removal from 'objects' array. Try to batch these removals
		// best performance, since lots of single removals has poor efficiency.
		this.pending_removal = new cr.ObjectSet();
		this.any_pending_removal = false;
	};
	
	RenderCell_.prototype.isEmpty = function ()
	{
		// 'Empty' state is a little non-trivial since there is the set of objects pending_removal
		// to take in to consideration. First of all if objects is empty then we know the cell is empty.
		if (!this.objects.length)
		{
			assert2(this.pending_removal.isEmpty(), "expected empty pending removal list");
			assert2(!this.any_pending_removal, "expected no pending removal state");
			return true;
		}
		
		// 'objects' is not empty. However if there are fewer instances in the removal queue, then
		// even if we called flush_pending we know there would still be instances left.
		// So we can safely indicate that the cell is not empty.
		if (this.objects.length > this.pending_removal.count())
			return false;
		
		// Otherwise every item in objects must be in the pending removal set.
		// The set will be empty if we update it. Use this opportunity to clear the state
		// and indicate empty.
		assert2(this.objects.length === this.pending_removal.count(), "expected pending queue to be same size as object list");
		this.flush_pending();		// takes fast path and just resets state
		return true;
	};
	
	RenderCell_.prototype.insert = function (inst)
	{
		// If the instance being inserted is in the pending_removal queue
		// then it is actually still in the objects array. In this case simply
		// remove the entry from the pending_removal queue.
		if (this.pending_removal.contains(inst))
		{
			this.pending_removal.remove(inst);
			
			// Unset the flag if there is no longer anything pending, to
			// avoid unnecessary work
			if (this.pending_removal.isEmpty())
				this.any_pending_removal = false;
			
			// 'inst' is still in objects array
			//assert2(this.objects.indexOf(inst) >= 0, "expected instance to be in objects list");
			return;
		}
		
		if (this.objects.length)
		{
			//assert2(this.objects.indexOf(inst) === -1, "instance already in render cell");
			
			// Simply append the instance to the end of the objects array. We could do a binary
			// search for the right place to insert, but then batch inserts will have poor efficiency.
			// It is probably better to sort the whole list later when it's needed if it has changed.
			// Note that if the inserted instance has a higher Z index than the previous top item,
			// then the sorted state is preserved so we can avoid marking it as needing a sort.
			var top = this.objects[this.objects.length - 1];
			
			if (top.get_zindex() > inst.get_zindex())
				this.is_sorted = false;		// 'inst' should be somewhere beneath 'top'
			
			this.objects.push(inst);
		}
		else
		{
			// Array is empty: add instance and leave in sorted mode (no need to sort one element)
			this.objects.push(inst);
			this.is_sorted = true;
		}
		
		//assert2(this.objects.indexOf(inst) >= 0, "expected instance to be in objects list");
		assert2(this.objects.length, "render cell is empty");
	};
	
	RenderCell_.prototype.remove = function (inst)
	{
		//assert2(this.objects.indexOf(inst) >= 0, "removing instance not in render cell");
		
		// Add to objects pending removal, for batching
		this.pending_removal.add(inst);
		this.any_pending_removal = true;
		
		// Distant and rarely updated cells could end up getting very long pending_removal queues.
		// To avoid a memory-leak like buildup, force a flush if it reaches 30 items.
		if (this.pending_removal.count() >= 30)
			this.flush_pending();
	};
	
	// Batch remove all instances pending removal, ensuring the 'objects'
	// array is up-to-date with correct instances, but not necessarily sorted
	RenderCell_.prototype.flush_pending = function ()
	{
		assert2(this.objects.length, "render cell is empty");
		
		if (!this.any_pending_removal)
			return;		// not changed
		
		// Special case: if every instance in the objects array is pending removal, then
		// simply clear everything.
		if (this.pending_removal.count() === this.objects.length)
		{
			// Expect every instance in 'objects' to be present in 'pending_removal'
			//for (var i = 0, len = this.objects.length; i < len; ++i)
			//{
			//	assert2(this.pending_removal.contains(this.objects[i]), "render cell invalid pending state");
			//}
			
			this.reset();
			return;
		}
		
		// remove all pending removal in one pass for best efficiency
		cr.arrayRemoveAllFromObjectSet(this.objects, this.pending_removal);
		
		this.pending_removal.clear();
		this.any_pending_removal = false;
	};
	
	function sortByInstanceZIndex(a, b)
	{
		// only called by ensure_sorted which comes after the layer updates its zindices itself,
		// so no need to call get_zindex, all direct zindex properties are up to date
		return a.zindex - b.zindex;
	};
	
	RenderCell_.prototype.ensure_sorted = function ()
	{
		if (this.is_sorted)
			return;		// already sorted
		
		this.objects.sort(sortByInstanceZIndex);
		this.is_sorted = true;
	};
	
	RenderCell_.prototype.reset = function ()
	{
		cr.clearArray(this.objects);
		this.is_sorted = true;
		this.pending_removal.clear();
		this.any_pending_removal = false;
	};
	
	RenderCell_.prototype.dump = function (result)
	{
		// append the updated, sorted object list to the result array
		this.flush_pending();
		this.ensure_sorted();
		
		// don't append anything if the list is empty, just creates more merge work
		if (this.objects.length)
			result.push(this.objects);
	};
	
	cr.RenderCell = RenderCell_;
	
	var fxNames = [ "lighter",
					"xor",
					"copy",
					"destination-over",
					"source-in",
					"destination-in",
					"source-out",
					"destination-out",
					"source-atop",
					"destination-atop"];

	cr.effectToCompositeOp = function(effect)
	{
		// (none) = source-over
		if (effect <= 0 || effect >= 11)
			return "source-over";
		
		return fxNames[effect - 1];	// not including "none" so offset by 1
	};
	
	cr.setGLBlend = function(this_, effect, gl)
	{
		if (!gl)
			return;
			
		// default alpha blend
		this_.srcBlend = gl.ONE;
		this_.destBlend = gl.ONE_MINUS_SRC_ALPHA;
		
		switch (effect) {
		case 1:		// lighter (additive)
			this_.srcBlend = gl.ONE;
			this_.destBlend = gl.ONE;
			break;
		case 2:		// xor
			break;	// todo
		case 3:		// copy
			this_.srcBlend = gl.ONE;
			this_.destBlend = gl.ZERO;
			break;
		case 4:		// destination-over
			this_.srcBlend = gl.ONE_MINUS_DST_ALPHA;
			this_.destBlend = gl.ONE;
			break;
		case 5:		// source-in
			this_.srcBlend = gl.DST_ALPHA;
			this_.destBlend = gl.ZERO;
			break;
		case 6:		// destination-in
			this_.srcBlend = gl.ZERO;
			this_.destBlend = gl.SRC_ALPHA;
			break;
		case 7:		// source-out
			this_.srcBlend = gl.ONE_MINUS_DST_ALPHA;
			this_.destBlend = gl.ZERO;
			break;
		case 8:		// destination-out
			this_.srcBlend = gl.ZERO;
			this_.destBlend = gl.ONE_MINUS_SRC_ALPHA;
			break;
		case 9:		// source-atop
			this_.srcBlend = gl.DST_ALPHA;
			this_.destBlend = gl.ONE_MINUS_SRC_ALPHA;
			break;
		case 10:	// destination-atop
			this_.srcBlend = gl.ONE_MINUS_DST_ALPHA;
			this_.destBlend = gl.SRC_ALPHA;
			break;
		}	
	};
	
	cr.round6dp = function (x)
	{
		return Math.round(x * 1000000) / 1000000;
	};
	
	// Compare two strings case insensitively. Use localeCompare where supported to avoid
	// creating garbage by using toLowerCase (which return new strings).
	/*
	var localeCompare_options = {
		"usage": "search",
		"sensitivity": "accent"
	};
	
	var has_localeCompare = !!"a".localeCompare;
	var localeCompare_works1 = (has_localeCompare && "a".localeCompare("A", undefined, localeCompare_options) === 0);
	var localeCompare_works2 = (has_localeCompare && "a".localeCompare("á", undefined, localeCompare_options) !== 0);
	var supports_localeCompare = (has_localeCompare && localeCompare_works1 && localeCompare_works2);
	*/
	
	cr.equals_nocase = function (a, b)
	{
		if (typeof a !== "string" || typeof b !== "string")
			return false;
			
		// Try to skip the possibly garbage-creating or slow checks lower down
		// by returning false early if different lengths or true early if the strings
		// are identical (no case conversion needed)
		if (a.length !== b.length)
			return false;
		if (a === b)
			return true;
		
		// Otherwise do an actual case-insensitive check
		/*
		if (supports_localeCompare)
		{
			return (a.localeCompare(b, undefined, localeCompare_options) === 0);
		}
		else
		{
		*/
			// Can't avoid creating garbage
			return a.toLowerCase() === b.toLowerCase();
		//}
	};
	
	// Returns true if input event (e.g. touch) is aimed at canvas; false if somewhere else
	// e.g. an input control.
	cr.isCanvasInputEvent = function (e)
	{
		var target = e.target;
		
		if (!target)
			return true;
		
		if (target === document || target === window)
			return true;
		
		if (document && document.body && target === document.body)
			return true;
		
		if (cr.equals_nocase(target.tagName, "canvas"))
			return true;
		
		return false;
	};
	
}());