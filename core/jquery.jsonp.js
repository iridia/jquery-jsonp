/*
 * jQuery JSONP Core Plugin 2.0pre2 (2010-05-11)
 * 
 * http://code.google.com/p/jquery-jsonp/
 *
 * Copyright (c) 2010 Julian Aubourg
 *
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 */
( function( $ , window , undefined ) {
	
	// ###################### UTILITIES ##
	
	// Noop
	function noop() {
	}
	
	// Generic callback for firefox & opera
	function genericCallback( data ) {
		jsonp.L = [ data ];
	}

	// Create a script tag
	function createScriptTag( url , tag ) {
		tag = $( "<script/>" )[ 0 ];
		if ( url ) tag.src = url;
		return tag;
	}
	
	// Call if defined
	function callIfDefined( method , object , parameters ) {
		method && method[ STR_APPLY ]( object , parameters );
	}
	
	// Give joining character given url
	function qMarkOrAmp( url ) {
		return /\?/ .test( url ) ? "&" : "?";
	}
	
	// Let the current thread running
	function later( functor ) {
		setTimeout( functor , 0 );
	}	
	
	var // String constants (for better minification)
		STR_APPEND = "append",
		STR_APPLY = "apply",
		STR_EMPTY = "",
		STR_ERROR = "error",
		STR_JQUERY_JSONP = "_jqjsp",
		STR_ONCLICK = "onclick",
		STR_ONLOAD = "onload",
		STR_ONREADYSTATECHANGE = "onreadystatechange",
		STR_SUCCESS = "success",
		STR_TIMEOUT = "timeout",
		
		// Browser detection (I hate it as much as you do)
		browser = $.browser,
		
		// Head element (for faster use)
		head = $( $( "head" )[ 0 ] || document.documentElement ),
		// Page cache
		pageCache = {},
		// Counter
		count = 0,
		
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
		if ( beforeSendCallback
			&& ( beforeSendCallback( xOptions , xOptions ) === false || done ) ) {
			return xOptions;
		}
			
		// Control entries
		url = url || STR_EMPTY;
		data = data ? ( (typeof data) == "string" ? data : $.param( data ) ) : STR_EMPTY;
			
		// Build final url
		url += data ? ( qMarkOrAmp( url ) + data ) : STR_EMPTY;
		
		// Add callback parameter if provided as option
		callbackParameter && ( url += qMarkOrAmp( url ) + escape(callbackParameter) + "=?" );
		
		// Add anticache parameter if needed
		! cacheFlag && ! pageCacheFlag && ( url += qMarkOrAmp( url ) + "_" + ( new Date() ).getTime() + "=" );
		
		// Replace last ? by callback parameter
		url = url.replace( /=\?(&|$)/ , "=" + successCallbackName + "$1" );
		
		// Utility function
		function notifySuccess( json ) {
			! done++ && later( function() {
				doCleanUp();
				// Pagecache if needed
				pageCacheFlag && ( pageCache [ url ] = { s: [ json ] } );
				// Apply the data filter if provided
				dataFilter && ( json = dataFilter[ STR_APPLY ]( xOptions , [ json ] ) );
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
		if ( pageCacheFlag && ( pageCached = pageCache[ url ] ) ) {
			pageCached.s ? notifySuccess( pageCached.s[ 0 ] ) : notifyError( pageCached );
			return xOptions;
		}
		
		// Firefox & Opera: use synchronized script execution
		if ( browser.mozilla || browser.opera ) {
			
			initiate = function( script , result ) {
				
				var scriptPost = createScriptTag(),
					numberedCallback = STR_JQUERY_JSONP + count++;
					
				cleanUp = function() {
					jsonp[ numberedCallback ] = undefined;
					$( script ).remove();
					$( scriptPost ).remove();
				};
				
				jsonp[ numberedCallback ] = function() {
					result = jsonp.L;
					jsonp.L = undefined;
					result ? notifySuccess( result[ 0 ] ) : notifyError();
				};
				
				window[ successCallbackName ] = genericCallback;
					
				scriptPost.text = "jQuery.jsonp." + numberedCallback + "()";
				
				head[ STR_APPEND]( script )[ STR_APPEND ]( scriptPost );
			};
		
		// IE: htmlFrom/event trick
		} else if ( browser.msie ) {
			
			initiate = function( script , tmp , func , headDom ) {
			
				cleanUp = function() {
					script[ STR_ONREADYSTATECHANGE ] = script[ STR_ONCLICK ] = null;
					$( script ).remove();
				};
				
				script.event = STR_ONCLICK;
				script.id = script.htmlFor = STR_JQUERY_JSONP + count++;
				
				script[ STR_ONREADYSTATECHANGE ] = function() {
					
					if ( script.readyState == "loaded" ) {
						
						if ( func = script[ STR_ONCLICK ] ) {
							
							tmp = window[ successCallbackName ];
							window[ successCallbackName ] = notifySuccess;
							
							try { func[ STR_APPLY ]( window ); } catch( _ ) {}
							
							window[ successCallbackName ] = tmp;
						}
						
						notifyError();
					}
				};
			 
				// Prevent IE6 <base /> bug
				// (plus needs to be made in DOM for the trick to work)
				headDOM = head[ 0 ];
				headDOM.insertBefore( script , headDOM.firstChild );
			};
			
		// Others: use an iframe
		} else {
			
			initiate = function( script ) {
				
				var // Create an iframe & add it to the document
					frame = $( "<iframe/>" )[ STR_APPEND + "To" ]( head ),
				
					// Get the iframe's window and document objects
					window = frame[ 0 ].contentWindow,
					document = window.document,
					
					// Error callback name
					errorCallbackName = successCallbackName == "E" ? "X" : "E";
					
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
				
				// Write to the document
				document.write( "<html><head>" + script.outerHTML + "</head><body " + STR_ONLOAD + "='" + errorCallbackName + "()'/></html>" );
				
				// Close doc
				document.close();			
			};
			
		}
		
		// Do it
		later( function( timeoutTimer ) {
			
			if ( done ) return;
			
			doCleanUp = function() {
				timeoutTimer && clearTimeout( timeoutTimer );
				later( cleanUp );
			};
			
			initiate( createScriptTag( url ) );
			
			// If a timeout is needed, install it
			timeoutTimer = timeout > 0 && setTimeout( function() {
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
	
} )( jQuery , window );