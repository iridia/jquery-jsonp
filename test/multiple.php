<?php

/**
 * Stress test for Issue #21
 * Thanks go to Tom Peters (weters@me.com) for the awesomely well written bug report and the code below
 */

if (!empty($_GET['attempt']))
{
    header('Content-type: application/json');
    echo $_GET['callback'].'('.json_encode(array('attempt' => $_GET['attempt'])).');';
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>jsonp-2.0.2 bug</title>
    <meta http-equiv="Content-type" content="text/html; charset=utf-8" />
</head>
<body>
    <div id="compares"><h1>Compares</h1></div>
    <div id="errors"><h1>Errors</h1></div>
    <script src="http://code.jquery.com/jquery-1.4.2.min.js"></script>
    <script src="../core/jquery.jsonp.js"></script>
    <script>
    (function() {
        var attempts = [ "first", "second", "third", "fourth" ],
            attempts_count = attempts.length,
            i;

        for ( i=0 ; i < attempts_count + 3 ; ++i ) {
            // create a new scope to track the current state of "i"
            ( function ( j ) {
                $.jsonp({
                    url: "?callback=?&attempt="+attempts[i],
                    context: $("#compares"),
                    beforeSend: function() {
                    	if ( j >= attempts_count ) {
	                        this.append( "Request #" + j + " has been aborted<br />" );
                    		return false;
                    	}
                    },
                    success: function( response ) {
                        var s = (response.attempt != attempts[j]) ? "FAIL" : "OK";
                        this.append(
                            'Response: ' + response.attempt + ', should be: ' + attempts[j] + ' ' + s + "<br />"
                        )
                    },
                    error: function(xopt, err) {
                        $("#errors").append(err + "<br />");
                    }
                });
            } )( i );
        }
    }());
    </script>
</body>
</html>
