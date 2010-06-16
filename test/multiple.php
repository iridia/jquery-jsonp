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

        for (i=0; i<attempts_count; ++i) {
            // create a new scope to track the current state of "i"
            (function() {
                var j = i;

                $.jsonp({
                    url: "?callback=?&attempt="+attempts[i],
                    success: function( response ) {
                        var s = (response.attempt != attempts[j]) ? "FAIL" : "OK";
                        $("#compares").append(
                            'Response: ' + response.attempt + ', should be: ' + attempts[j] + ' ' + s + "<br />"
                        )
                    },
                    error: function(xopt, err) {
                        $("#errors").append(err + "<br />");
                    }
                });
            }());
        }
    }());
    </script>
</body>
</html>
