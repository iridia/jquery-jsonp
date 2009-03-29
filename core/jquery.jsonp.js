/*
 * jQuery JSONP Core Plugin 1.0.4 (2009-03-29)
 * 
 * http://code.google.com/p/jquery-jsonp/
 *
 * Copyright (c) 2009 Julian Aubourg
 *
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 */
(function($){
	
	// ###################### UTILITIES ##
	// Test a value is neither undefined nor null
	var x = function(o) { return o!==undefined && o!==null; },
	
	// Head element
	H = $("head"),
	// Page cache
	Z = {},
	
	// ###################### DEFAULT OPTIONS ##
	K = {
		//beforeSend: undefined,
		//cache: false,
		callback: "C",
		//callbackParameter: undefined,
		//complete: undefined,
		//data: ""
		//dataFilter: undefined,
		//error: undefined,
		//pageCache: false,
		//success: undefined,
		//timeout: 0,		
		url: location.href
	};

	// ###################### MAIN FUNCTION ##
	$.jsonp = function(d) {
		
		// Build data with default
		d = $.extend({},K,d);

		// Call beforeSend if provided
		// (early abort if false returned)
		if (x(d.beforeSend)) {
			var t = 0;
			d.abort = function() { t = 1; };
			if (d.beforeSend(d,d)===false || t) return d;
		}
		
		// Control entries & data type
		// + declare variables
		var _="",
		y = "success",
		n = "error",
		u = x(d.url)?d.url:_,
		p = x(d.data)?d.data:_,
		s = (typeof p)=="string",
		// Keep hand to running thread
		k = function(f) { setTimeout(f,1); },
		// Various variable
		S,P,i,j,U;
		// Convert parameters to string if needs be
		p = s?p:$.param(p);
		// Add callback parameter if provided as option
		x(d.callbackParameter)
			&& (p += (p==_?_:"&")+escape(d.callbackParameter)+"=?");
		// Add anticache parameter if needed
		!d.cache && !d.pageCache
			&& (p += [(p==_?_:"&"),"_xx",(new Date()).getTime(),"=",1].join(_));
		// Search for ? in url
		S = u.split("?");
		// Also in parameters if provided
		// (and merge array)
		if (p!=_) {
			P = p.split("?");
			j = S.length-1;
			j && (S[j] += "&" + P.shift());
			S = S.concat(P);
		}
		// If more than 2 ? replace the last one by the callback
		i = S.length-2;
		i && (S[i] += d.callback + S.pop());
		// Build the url
		U = S.join("?");
		
		// Check page cache
		if (d.pageCache && x(Z[U])) {
			k(function() {
				// If an error was cached
				if (x(Z[U].e)) {
					// Call error then complete
					x(d.error) && d.error(d,n);
					x(d.complete) && d.complete(d,n);
				} else {
					var v = Z[U].s;
					// Apply the data filter if provided
					x(d.dataFilter) && (v = d.dataFilter(v));
					// Call success then complete
					x(d.success) && d.success(v,y);
					x(d.complete) && d.complete(d,y);				
				}
			});
			return d;
		}
		
		// Create an iframe & add it to the document
		var f = $("<iframe />");
		H.append(f);
		// Get the iframe's window and document objects
		var F = f[0],
		W = F.contentWindow || F.contentDocument,
		D = W.document;
		if(!x(D)) {
			D = W;
		    W = D.getParentNode();
		}
		// Cleanup function (reference)
		var w,
		// Error function
		e = function (_,m) {
			// If pure error, cache if needed
			d.pageCache && !x(m) && (Z[U] = {e: 1}); 
			// Cleanup
			w();
			// Call error then complete
			m = x(m)?m:n;
			x(d.error) && d.error(d,m);
			x(d.complete) && d.complete(d,m);
		},
		// Flag to know if the request has been treated
		t = 0,
		// Install callbacks
		C = d.callback,
		E = C=="E"?"X":"E";
		D.open(); // We have to open the document before
				  // declaring variables in the iframe's window
				  // Don't ask me why, I have no clue
		W[C] = function(v) {
			// Set as treated
			t = 1;
			d.pageCache && (Z[U] = {s: v});
			// Give hand back to frame
			// To finish gracefully
			k(function(){
				// Cleanup
				w();
				// Apply the data filter if provided
				x(d.dataFilter) && (v = d.dataFilter(v));
				// Call success then complete
				x(d.success) && d.success(v,y);
				x(d.complete) && d.complete(d,y);
			});
		};
		W[E] = function(s) {
			// If not treated, mark
			// then give hand back to iframe
			// for it to finish gracefully
			(!s || s=="complete") && !t++ && k(e);
		};
		// Clean up function (declaration)
		w = function() {
			W[E] = undefined;
			W[C] = undefined;
			try { delete W[E]; } catch(_) {}
			try { delete W[C]; } catch(_) {}
			D.open()
			D.write(_);
			D.close();
			f.remove();
		}
		// Write to the iframe (sends the request)
		// We let the hand to current code to avoid
		// pre-emptive callbacks
		k(function() {
			D.write([
			'<html><head><script src="',
			U,'" onload="',
			E,'()" onreadystatechange="',
			E,'(this.readyState)"></script></head><body onload="',
			E,'()"></body></html>'
			].join(_)
			);
			// Close (makes some browsers happier)
			D.close();
		});
		
		// If a timeout is needed, install it
		d.timeout>0 && setTimeout(function(){
				!t && e(_,"timeout");
		},d.timeout);
		
		// Install abort to emulate xhr
		// and return object
		d.abort = w;
		return d;
	}
	
	// ###################### SETUP FUNCTION ##
	$.jsonp.setup = function(o) {
		$.extend(K,o);
	};


	
})(jQuery);