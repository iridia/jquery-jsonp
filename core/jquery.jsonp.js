/*
 * jQuery JSONP Core Plugin 2.0pre (2010-05-11)
 * 
 * http://code.google.com/p/jquery-jsonp/
 *
 * Copyright (c) 2010 Julian Aubourg
 *
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 */
( function( $ , window , document , NULL , undefined ) {
	
	// ###################### UTILITIES ##

	// Get the head or documentElement of a document
	function getHead( document ) {
		return document.getElementsByTagName( "head" )[ 0 ] || document.documentElement;
	}
	
	// Create a script tag
	function createScriptTag( document , url , tag ) {
		tag = document.createElement( STR_SCRIPT );
		tag.src = url;
		return tag;
	}
	
	// Test a value is neither undefined nor null
	function defined( v ) {
		return v !== undefined && v !== NULL;
	}

	// Call if defined
	function callIfDefined( method , object , parameters ) {
		defined( method ) && method[ STR_APPLY ]( object , parameters );
	}
	
	// Give joining character given url
	function qMarkOrAmp( url ) {
		return /\?/ .test( url ) ? "&" : "?";
	}
	
	// Let the current thread running
	function later( functor ) {
		setTimeout( functor , 0 );
	}	
	
	var // Noop
		noop = $.noop || function() {},
	
		// String constants (for better minification)
		STR_APPEND_CHILD = "appendChild",
		STR_APPLY = "apply",
		STR_EMPTY = "",
		STR_ERROR = "error",
		STR_ONCLICK = "onclick",
		STR_ONLOAD = "onload",
		STR_ONREADYSTATECHANGE = "onreadystatechange",
		STR_SCRIPT = "script",
		STR_SUCCESS = "success",
		STR_TIMEOUT = "timeout",
		STR_WRITE = "write",
		
		// Head element (for faster use)
		head = $( getHead( document ) ),
		// Page cache
		pageCache = {},
		// IE counter
		countIE = 0,
		
		// ###################### DEFAULT OPTIONS ##
		xOptionsDefaults = {
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
	function jsonp( xOptions ) {
		
		// Build data with default
		xOptions = $.extend( {} , xOptionsDefaults , xOptions );
		
		// References to xOptions members (for better minification)
		var completeCallback = xOptions.complete,
			dataFilter = xOptions.dataFilter,
			callbackParameter = xOptions.callbackParameter,
			successCallbackName = xOptions.callback,
			cacheFlag = xOptions.cache,
			pageCacheFlag = xOptions.pageCache,
			url = xOptions.url,
			data = xOptions.data,
			timeout = xOptions.timeout,
			pageCached,
			
			// References to beforeSend (for better minification)
			beforeSendCallback = xOptions.beforeSend,
		
			// Abort/done flag
			done = 0,
			
			// Life-cycle functions
			cleanUp = noop,
			doCleanUp = noop,
			initiate = noop;
		
		// Put a temporary abort
		xOptions.abort = function() { 
			! done++ &&	doCleanUp(); 
		};

		// Call beforeSend if provided (early abort if false returned)
		if ( defined( beforeSendCallback )
			&& ( beforeSendCallback( xOptions , xOptions ) === false || done ) ) {
			return xOptions;
		}
			
		// Control entries
		url = url || STR_EMPTY;
		data = defined( data ) ? ( (typeof data) == "string" ? data : $.param( data ) ) : STR_EMPTY;
			
		// Build final url
		url += data ? ( qMarkOrAmp( url ) + data ) : STR_EMPTY;
		
		// Add callback parameter if provided as option
		defined(callbackParameter)
			&& ( url += qMarkOrAmp( url ) + escape(callbackParameter) + "=?" );
		
		// Add anticache parameter if needed
		! cacheFlag && ! pageCacheFlag
			&& ( url += qMarkOrAmp( url ) + "_" + ( new Date() ).getTime() + "=" );
		
		// Replace last ? by callback parameter
		url = url.replace( /=\?(&|$)/ , "=" + successCallbackName + "$1" );
		
		// Utility function
		function notifySuccess( json ) {
			! done++ && later( function() {
				doCleanUp();
				// Pagecache if needed
				pageCacheFlag && ( pageCache [ url ] = { s: json } );
				// Apply the data filter if provided
				defined( dataFilter ) && ( json = dataFilter[ STR_APPLY ]( xOptions , [ json ] ) );
				// Call success then complete
				callIfDefined( xOptions.success , xOptions , [ json , STR_SUCCESS ] );
				callIfDefined( completeCallback , xOptions , [ xOptions , STR_SUCCESS ] );
			} );
		}
		
	    function notifyError( type ) {
	    	! done++ && later( function() {
	    		doCleanUp();
	    		// Fix type
		    	type = type || STR_ERROR;
				// If pure error (not timeout), cache if needed
				pageCacheFlag && type != STR_TIMEOUT && ( pageCache[ url ] = type );
				// Call error then complete
				callIfDefined( xOptions.error , xOptions , [ xOptions , type ] );
				callIfDefined( completeCallback , xOptions , [ xOptions , type ] );
	    	} );
	    }
	    
		// Check page cache
		if ( pageCacheFlag && defined( pageCached = pageCache[ url ] ) ) {
			defined( pageCached.s )	? notifySuccess( pageCached.s )	: notifyError( pageCached );
			return xOptions;
		}
		
		// IE: htmlFrom/event trick
		if ( $.browser.msie ) {
			
			var script = createScriptTag( document , url ),
				tmp,
				func;
			
			cleanUp = function() {
				script[ STR_ONREADYSTATECHANGE ] = script[ STR_ONCLICK ] = NULL;
				$( script ).remove();
			};
			
			initiate = function() {
				head[ 0 ][ STR_APPEND_CHILD ]( script );
			};
			
			script.type = "text/javascript";
			script.event = STR_ONCLICK;
			script.id = script.htmlFor = "-jqsp" + countIE++;
			
			script[ STR_ONREADYSTATECHANGE ] = function() {
				
				if ( script.readyState == "loaded" ) {
					
					if ( func = script[ STR_ONCLICK ] ) {
						
						// Install callback
						tmp = window[ successCallbackName ];
						
						window[ successCallbackName ] = notifySuccess;
						
						try { func[ STR_APPLY ]( window ); } catch( _ ) {}
						
						window[ successCallbackName ] = tmp;
					}
					
					notifyError();
				}
			};
			 
		// Use an iframe for other browsers			
		} else {
			
			initiate = function() {
				
				var // Create an iframe & add it to the document
					frame = $( "<iframe style='display:none'/>" ).appendTo( head ),
				
					// Get the iframe's window and document objects
					window = frame[ 0 ].contentWindow,
					document = window.document,
					
					// Error callback name
					errorCallbackName = successCallbackName == "E" ? "X" : "E",
					
					// Script creation name
					scriptCallbackName = successCallbackName == "L" ? "Y" : "L",
					
					// Frame writing strings
					isGecko = $.browser.mozilla,
					
					// Script tag
					tplValues = [
						isGecko ? STR_EMPTY : scriptCallbackName + "()",
						isGecko ? scriptCallbackName : errorCallbackName,
						errorCallbackName
					], 
					script = createScriptTag( document , url );
					
				// Clean up function
				cleanUp = function() {
					frame.remove();
				};
				
				// We have to open the document before
				// declaring variables in the iframe's window
				// Don't ask me why, I have no clue
				document.open();
				
				// Install callbacks
				window[ successCallbackName ] = notifySuccess;
				window[ errorCallbackName ] = notifyError;
				
				window[ scriptCallbackName ] = function() {
					if ( isGecko ) {
						script[ STR_ONLOAD ] = notifyError;
						getHead( document )[ STR_APPEND_CHILD ]( script );
					} else {
						document[ STR_WRITE ]( script.outerHTML );
					}
				};
				
				// Write to the document
				document[ STR_WRITE ](
					( "<html><head><" + STR_SCRIPT + ">0</" + STR_SCRIPT + "></head><body " + STR_ONLOAD + "='1()' onerror='2()'/></html>" ).replace( /([0-2])/g , function( _ , $1 ) {
						return tplValues[ 1 * $1 ];
					} )
				);
				
				// Close doc
				document.close();			
			};
			
		}
		
		// Do it
		later( function( timeoutTimer ) {
			
			if ( done ) return;
			
			doCleanUp = function() {
				timeoutTimer && clearTimeout( timeoutTimer );
				cleanUp();
			};
			
			initiate();
			
			// If a timeout is needed, install it
			timeoutTimer = timeout && setTimeout( function() {
				notifyError( STR_TIMEOUT );
			} , timeout );
			
		} );
		
		return xOptions;
	}
	
	// ###################### SETUP FUNCTION ##
	jsonp.setup = function( xOptions ) {
		$.extend( xOptionsDefaults , xOptions );
	};

	// ###################### INSTALL in jQuery ##
	$.jsonp = jsonp;
	
} )( jQuery , window , document , null );