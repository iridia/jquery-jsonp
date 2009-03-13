/*
 * jQuery JSONP Core Plugin 1.0 (2009-03-13)
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
	function x(o) {
		return o!==undefined && o!==null;
	}
	// Head element
	var H = $("head");
	// Page cache
	var Z = {};
	
	// ###################### DEFAULT OPTIONS ##
	var K = {
		//beforeSend: undefined,
		//cache: false,
		callback: "C",
		//dataFilter: undefined,
		//complete: undefined,
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
		var u = x(d.url)?d.url:"";
		var p = x(d.data)?d.data:"";
		var s = (typeof p)=="string";
		// Convert parameters to string if needs be
		p = s?p:$.param(p);
		// Add anticache parameter if needed
		!d.cache && !d.pageCache
			&& (p += [(p==""?"":"&"),"_xx",(new Date()).getTime(),"=",1].join(""));
		// Search for ? in url
		var S = u.split("?");
		// Also in parameters if provided
		// (and merge array)
		if (p!="") {
			var P = p.split("?");
			var j = S.length-1;
			if (j>0) {
				S[j] += "&" + P[0];
				P.shift();
			}
			S.concat(P);
		}
		// If more than 2 ? replace the last one by the callback
		var i = S.length-1;
		if (i>1) {
			S[i-1] += d.callback + S[i];
			S.pop();
		}
		// Build the url
		var U = S.join("?");
		
		// Check page cache
		if (d.pageCache && x(Z[U])) {
			setTimeout(function() {
				// If an error was cached
				if (x(Z[U].e)) {
					// Call error then complete
					x(d.error) && d.error(d,"error");
					x(d.complete) && d.complete(d,"error");
				} else {
					var v = Z[U].s;
					// Apply the data filter if provided
					x(d.dataFilter) && (v = d.dataFilter(v));
					// Call success then complete
					x(d.success) && d.success(v,"success");
					x(d.complete) && d.complete(d,"success");				
				}
			},1);
			return d;
		}
		
		// Create an iframe & add it to the document
		var f = $("<iframe />");
		H.append(f);
		// Get the iframe's window and document objects
		var F = f[0];
		var W = F.contentWindow || F.contentDocument;
		var D = W.document;
		if(!x(D)) {
			D = W;
		    W = D.getParentNode();
		}
		// Cleanup function (reference)
		var w;
		// Error function
		function e(m) {
			// If pure error, cache if needed
			d.pageCache && !x(m) && (Z[U] = {e: 1}); 
			// Cleanup
			w();
			// Call error then complete
			m = x(m)?m:"error";
			x(d.error) && d.error(d,m);
			x(d.complete) && d.complete(d,m);
		}
		// Flag to know if the request has been treated
		var t = 0;
		// Install callbacks
		var C = d.callback;
		var E = C=="E"?"X":"E";
		D.open(); // We have to open the document before
				  // declaring variables in the iframe's window
				  // Don't ask me why, I have no clue
		W[C] = function(v) {
			// Set as treated
			t = 1;
			d.pageCache && (Z[U] = {s: v});
			// Give hand back to frame
			// To finish gracefully
			setTimeout(function(){
				// Cleanup
				w();
				// Apply the data filter if provided
				x(d.dataFilter) && (v = d.dataFilter(v));
				// Call success then complete
				x(d.success) && d.success(v,"success");
				x(d.complete) && d.complete(d,"success");
			},1);
		};
		W[E] = function() {
			// If not treated, mark
			// then give hand back to iframe
			// for it to finish gracefully
			!t++ && setTimeout(function(){e();},1);
		};
		// Clean up function (declaration)
		w = function() {
			W[E] = undefined;
			W[C] = undefined;
			try { delete W[E]; } catch(_) {}
			try { delete W[C]; } catch(_) {}
			D.open()
			D.write("");
			D.close();
			f.remove();
		}
		// Write to the iframe (sends the request)
		// We let the hand to current code to avoid
		// pre-emptive callbacks
		setTimeout(function() {
			D.write(
				['<html><head><script type="text/javascript" src="',
				 U,
				 '" /><script type="text/javascript">',
				 E,'()</script></head><body onload="',
				 E,'()" onerror="',
				 E,'()" /></html>'].join("")
			);
			// Close (makes some browsers happier)
			D.close();
		},1);
		
		// If a timeout is needed, install it
		d.timeout>0 && setTimeout(function(){
				!t && e("timeout");
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