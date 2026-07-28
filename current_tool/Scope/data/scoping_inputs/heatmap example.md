<!DOCTYPE html>
<head>
    <meta name="viewport" id="vp" content="initial-scale=1.0,user-scalable=no,maximum-scale=1,width=device-width" />
    <meta charset="utf-8" />


    <link rel="stylesheet" href="https://api.mazemap.com/js/v3.0.6/mazemap.min.css">
    <script type='text/javascript' src='https://api.mazemap.com/js/v3.0.6/mazemap.min.js'></script>

    <style>
        body { margin:0px; padding:0px; width: 100vw; height:100vh; }
    </style>
</head>
<body>
    <div id="map" class="mazemap"></div>

    <script>
        var myMap = new Mazemap.Map({
            // container id specified in the HTML
            container: 'map',
            campuses: 1,
            center: {lng: 10.403816545737072, lat: 63.417545618175495},
            bearing: 17.514266117970237,
            pitch: 55.5,
            zoom: 17.567747750432794,
            zLevel: 1,
            hash: true
        });

        // Add zoom and rotation controls to the map.
        myMap.addControl(new Mazemap.mapboxgl.NavigationControl());
        myMap.on('load', () => {
            myMap.addSource('heatpoints', {
                "type": "geojson",
                "data": "./heatpoints.geojson"
            });


        myMap.addLayer({
            "id": "heatpoints",
            "type": "heatmap",
            "source": "heatpoints",
            "maxzoom": 24,
            "paint": {
                // Increase the heatmap weight based on frequency and property magnitude
                "heatmap-weight": 1,
                // Increase the heatmap color weight weight by zoom level
                // heatmap-intensity is a multiplier on top of heatmap-weight
                "heatmap-intensity": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    16, 0.2,
                    22, 1
                ],
                // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
                // Begin color ramp at 0-stop with a 0-transparancy color
                // to create a blur-like effect.
                "heatmap-color": [
                    "interpolate",
                    ["linear"],
                    ["heatmap-density"],
                    0, "rgba(0,0,255,0)",
                    0.2, "#1FAFFC",
                    0.4, "#5BD76F",
                    0.6, "#FFE61E",
                    0.8, "#FF7B00",
                    1, "#FF3333"
                ],
                // Adjust the heatmap radius by zoom level
                "heatmap-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 5,
                    22, 30
                ],
                "heatmap-opacity": 0.8
            }
        });
    });
    </script>
</body>
