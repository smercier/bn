var projet={};
$(function() {
    /*-------------------------------------------------------
                            MAP
    -------------------------------------------------------*/
    projet.centre={
        latlon:[47,-71.87],
        zoom:12,
    };
    
    projet.map = L.map('map',{
    });

    projet.map.setView(projet.centre.latlon,projet.centre.zoom);

    /*-------------------------------------------------------
                            LAYER
    -------------------------------------------------------*/
    L.tileLayer('http://cartalib.mapgears.com/mapcache/tms/1.0.0/brasnord@g/{z}/{x}/{y}.png', {
        maxZoom: 18,
        tms: true,
        dragging: false,
        zoomAnimation:true
    }).addTo(projet.map);


    /*-------------------------------------------------------
                            GEOJSON
    -------------------------------------------------------*/
    projet.layers={};
    projet.layers.sentiers = {};
    var sentiers = projet.layers.sentiers;

    projet.layers.trajetSelected = {};
    var trajetSelected = projet.layers.trajetSelected;
    trajetSelected.features=[];


    sentiers.defaultStyle = {
        "color": "#CF320D",
        "weight": 10,
        "opacity": 0
    };


    sentiers.highlightStyle = {
        "color": "#6ACE18",
        "weight": 4,
        "opacity": 0.7,
        "dashArray": "5, 15"
    };

    projet.clone = function(obj){
        if(obj == null || typeof(obj) != 'object')
            return obj;

        var temp = obj.constructor(); // changed

        for(var key in obj)
            temp[key] = projet.clone(obj[key]);
        return temp;
    };


    //drawPlot
    projet.drawPlot = function(features) {

        $('#chart').empty();
        $('#chart').show()
        var profilTrajet = [];
        var latlonBefore = "null";
        var dist = 0;
        var maxZ=0, minZ=99999;
        projet.layers.elevationSelected = [];

        $.each(features, function( key0, layer ) {
            $.each( geojsonElev.features, function( key1, value ) {
               var key;
               if (layer.feature.properties.inverse == false){
                    key = key1;
                } else {
                    key = geojsonElev.features.length-key1-1;
                };

                if(geojsonElev.features[key].properties.no_trajet == layer.feature.properties.no_trajet){
                    var latlonSegment =  new L.LatLng(geojsonElev.features[key].geometry.coordinates[1],geojsonElev.features[key].geometry.coordinates[0]);
                    if (latlonBefore != "null") {
                        dist = dist+(latlonSegment.distanceTo(latlonBefore)/1000);
                    }
                    latlonBefore=latlonSegment;
                    projet.layers.elevationSelected.push(projet.clone(geojsonElev.features[key]));
                    projet.layers.elevationSelected[projet.layers.elevationSelected.length-1].properties.sumDist = dist;
                    var z =  geojsonElev.features[key].properties.elevation;
                    profilTrajet.push([dist, z]);
                    if(z < minZ){
                        minZ = z;
                    } else if (z > maxZ) {
                        maxZ = z;
                    };
                };
            });
        });
        sentiers.distTotal = dist;
        
        if ((maxZ-minZ)<100) {
            maxZ = maxZ + 50;
            minZ = minZ - 50;
        };
        
        projet.plot = $.jqplot ('chart', [profilTrajet,[]], {
            title: 'Élévation du trajet (en mètre)',
            series:[
                {
                    markerOptions: { size: 0 }
                }
            ],
            axes: {
                xaxis: {
                    label: "Distance (km)",
                    pad: 0
                },
                yaxis: {
                    //label: "Élévation",
                    min: parseInt((minZ-30)/10)*10, 
                    max: parseInt((maxZ+30)/10)*10
                }
            },
            highlighter: {
                show: true,
                sizeAdjust: 7.5
            },
            cursor: {
                show: false
            }
        }); 

        $( "#slider" ).slider({ 
            max: ($(".jqplot-xaxis-tick").last().text()*10),
            slide: function( event, ui ) {
                var delta = 1;
                var point;
                $.each( profilTrajet, function( key, value ) { 
                    var diff = Math.abs(ui.value/10-value[0]);
                    if(diff<delta){
                        delta = diff;
                        point = value;
                    };
                });
                projet.plot.series[1].data = [point];
                projet.plot.replot();

                $.each( projet.layers.elevationSelected, function( key, value ) {
                    if(value.properties.sumDist == point[0]){   
                        projet.marker.setLatLng(new L.LatLng(value.geometry.coordinates[1], value.geometry.coordinates[0]));
                        if(projet.marker._popup){
                            projet.marker._popup.setContent('<h3>'+value.properties.nom+'</h3><p>Altitude: '+Math.round(value.properties.elevation)+' m<br />Distance parcourue: '+Math.round(value.properties.sumDist)+' km<br />Distance restante: '+Math.round(sentiers.distTotal-value.properties.sumDist)+' km</p>');
                        };
                        return false;
                    };
                });
            }
        }); 
        $( "#slider" ).width( $(".jqplot-event-canvas")[0].width -10);

    }; 


    trajetSelected.addTrajet = function(layer) {
        var layerTrajet={};
        layerTrajet._latlngs = projet.clone(layer._latlngs);
        layerTrajet.feature = projet.clone(layer.feature);
        trajetSelected.features.push(layerTrajet);

        layer._leaflet_id = $.map(projet.layers.trajetSelected.layer._layers, function(n, i) { return i; }).length + 1 ;
        layerTrajet.feature.properties.inverse = false;

        if (layer._leaflet_id == 1) {
            layer.setStyle(sentiers.highlightStyle);
            trajetSelected.layer.addLayer(layer)
        } else if ( layer._leaflet_id == 2 && trajetSelected.layer._layers[layer._leaflet_id-1]._latlngs[0].distanceTo(layer._latlngs[0]) < 0.2) {
            layer.setStyle(sentiers.highlightStyle);
            trajetSelected.features[layer._leaflet_id-2]._latlngs.reverse();
            trajetSelected.features[layer._leaflet_id-2].feature.properties.inverse=true;
            trajetSelected.layer.addLayer(layer)
        } else if (layer._leaflet_id == 2 && trajetSelected.layer._layers[layer._leaflet_id-1]._latlngs[0].distanceTo(layer._latlngs[layer._latlngs.length-1]) < 0.2) {
            layer.setStyle(sentiers.highlightStyle);
            trajetSelected.features[layer._leaflet_id-1]._latlngs.reverse();
            trajetSelected.features[layer._leaflet_id-1].feature.properties.inverse = true;
            trajetSelected.features[layer._leaflet_id-2]._latlngs.reverse();
            trajetSelected.features[layer._leaflet_id-2].feature.properties.inverse=true;
            trajetSelected.layer.addLayer(layer)
        } else if (trajetSelected.features[layer._leaflet_id-2]._latlngs[trajetSelected.layer._layers[layer._leaflet_id-1]._latlngs.length-1].distanceTo(layer._latlngs[layer._latlngs.length-1]) < 0.2) {
            layer.setStyle(sentiers.highlightStyle);
            trajetSelected.features[layer._leaflet_id-1]._latlngs.reverse();
            trajetSelected.features[layer._leaflet_id-1].feature.properties.inverse = true;
            trajetSelected.layer.addLayer(layer)
        } else if (trajetSelected.features[layer._leaflet_id-2]._latlngs[trajetSelected.layer._layers[layer._leaflet_id-1]._latlngs.length-1].distanceTo(layer._latlngs[0]) < 0.2) {
            layer.setStyle(sentiers.highlightStyle);    
            trajetSelected.layer.addLayer(layer)
        } else {
            trajetSelected.features.pop();
            alert("Pas de suite");
        };

        trajetSelected.layer.bringToFront();
        projet.marker.snapediting._guides = [];
        projet.marker.snapediting.addGuideLayer(trajetSelected.layer);
        projet.marker.snapediting.enable();
        if(projet.marker._popup){
            projet.marker.closePopup();
            sentiers.drawMarker();
        };
    };

    sentiers.onEachFeature = function(feature, layer) {
        layer.on('click', function(feature) { 
            //alert(layer.feature.properties.nom);   
            trajetSelected.addTrajet(layer);
            projet.drawPlot(trajetSelected.features);
            projet.marker.setLatLng(trajetSelected.features[0]._latlngs[0]);
            projet.marker.setOpacity(1);
        });
    };

    sentiers.layer = L.geoJson(geojson.features, {
        style: sentiers.defaultStyle,
        onEachFeature: sentiers.onEachFeature
    }).addTo(projet.map);

    trajetSelected.layer = L.geoJson([], {
        style: sentiers.highlightStyle
        //onEachFeature: geojsonLayer.onEachFeature
    });


    projet.marker = L.marker([47,-71.87]).addTo(projet.map);
    projet.marker.setOpacity(0);
    projet.marker.snapediting = new L.Handler.MarkerSnap(projet.map, projet.marker);


    sentiers.drawMarker = function() {
        
        var markerPoint = [];

        var dist = projet.layers.elevationSelected[projet.marker.markerElevation.key].properties.sumDist;
        var z = projet.layers.elevationSelected[projet.marker.markerElevation.key].properties.elevation;
        var nom = projet.layers.elevationSelected[projet.marker.markerElevation.key].properties.nom;
        markerPoint.push([dist, z]);

        $( "#slider" ).slider( "value", dist*10 );
        projet.plot.series[1].data = markerPoint;
        projet.plot.replot();

        projet.marker.bindPopup('<h3>'+nom+'</h3><p>Altitude: '+Math.round(z)+' m<br />Distance parcourue: '+Math.round(dist)+' km<br />Distance restante: '+Math.round(sentiers.distTotal-dist)+' km</p>').openPopup();
    }; 

    projet.marker.markerElevation=[];
    projet.marker.findElevation = function() {
        if(projet.marker.snap){
            var dist=99999;
            $.each( projet.layers.elevationSelected, function( key, value ) {
                if(value.properties.no_trajet == projet.marker.snap.feature.properties.no_trajet){
                    var latlng = new L.LatLng(value.geometry.coordinates[1], value.geometry.coordinates[0]);
                    var distSegment = latlng.distanceTo(projet.marker._latlng);
                    if (distSegment < dist) {
                        dist = distSegment;
                        projet.marker.markerElevation.key = key;
                    };
                };
            });
            sentiers.drawMarker();
        } else {
            projet.marker.closePopup();
        };
    };


    projet.marker.on('drag', function(e) {
       projet.marker.findElevation(); 
    })
    projet.marker.on('click', function(e) {
       projet.marker.findElevation(); 
    });


    /*-------------------------------------------------------
                        Liste des sentiers
    -------------------------------------------------------*/
    $.each( sentiersjson.sentiers, function( key, value ) {
        $("#sentiers").append("<h3>"+value.nom+"</h3>");
        $("#sentiers").append("<div id=sentiers"+key+"><p><b>Distance: </b>"+value.distance+"<br /><b>Temps estimé (en été): </b>"+value.temps_estime_ete+"<br /><b>Dénivellation: </b>"+value.denivellation+"<br /><b>Difficulté: </b>"+value.difficulte+"<br /><b>Description: </b>"+value.description+"</p></div>");
        if ( value.etapes != []){
            $("#sentiers"+key).append("<div id=\"etape"+key+"\"></div>");
            $.each( value.etapes, function( key2, value2 ) {
                $("#etape"+key).append("<h3>"+value2.nom+"</h3>");
                $("#etape"+key).append("<div><p><b>Distance:</b> "+value2.distance+"<br /><b>Temps estimé (en été):</b> "+value2.temps_estime_ete+"<br /><b>Dénivellation:</b> "+value2.denivellation+"<br /><b>Difficulté: </b>"+value2.difficulte+"<br /><b>Description: </b>"+value2.description+"</p></div>");    
            });
            $("#etape"+key).accordion({collapsible: true, active:false, heightStyle: "content"});
            $( "#etape"+key ).on( "accordionactivate", function( event, ui ) {
                
                var idSentier = $( "#etape"+key ).accordion( "option", "active" );
                trajetSelected.features=[];
                trajetSelected.layer= L.geoJson([], {
                    style: sentiers.highlightStyle
                 });
                sentiers.layer.setStyle(sentiers.defaultStyle);
                if (idSentier !== false) {
                    event.stopPropagation()
                    $.each(sentiersjson.sentiers[key].etapes[idSentier].trajet, function( key, value ) {
                        $.each(sentiers.layer._layers, function( key2, value2 ) {
                            if(value == value2.feature.properties.no_trajet) {
                                trajetSelected.addTrajet(value2);
                            };
                        });
                    });
                    projet.drawPlot(trajetSelected.features);
                    projet.map.fitBounds(trajetSelected.layer.getBounds());
                };
            });

        };
    });

    $(function() {
        $( "#sentiers" ).accordion({collapsible: true, active:false, heightStyle: "content"});
    });

    $( "#sentiers" ).on( "accordionactivate", function( event, ui ) {
        var idSentier = $( "#sentiers" ).accordion( "option", "active" ); //$("#sentiers>div:visible")[0].id.substring(8)
        trajetSelected.features=[];
        trajetSelected.layer= L.geoJson([], {
            style: sentiers.highlightStyle
         });
        sentiers.layer.setStyle(sentiers.defaultStyle);
        if (idSentier !== false) {
            $.each(sentiersjson.sentiers[idSentier].trajet, function( key, value ) {
                $.each(sentiers.layer._layers, function( key2, value2 ) {
                    if(value == value2.feature.properties.no_trajet) {
                        trajetSelected.addTrajet(value2);
                    };
                });
            });
            projet.drawPlot(trajetSelected.features);
            projet.marker.setLatLng(trajetSelected.features[0]._latlngs[0]);
            projet.marker.setOpacity(1);
            projet.map.fitBounds(trajetSelected.layer.getBounds());
        } else {
            $('#chart').hide()
            projet.marker.setOpacity(0);
        }
    });


    /*-------------------------------------------------------
                    Installations
    -------------------------------------------------------*/
    projet.layers.installations={};
    projet.layers.installations.onEachFeature = function(feature, layer) {
        layer.on('click', function(feature, layer) { 
            var content = '<h2>'+feature.target.feature.properties.nom+'</h2>';
            if (feature.target.feature.properties.alt_m != null){
                content = content + '<p> Dénivellé: ' +feature.target.feature.properties.alt_m+ '</p>';
            };
            if (feature.target.feature.properties.com != null){
                content = content + '<p>'+feature.target.feature.properties.com+ '</p>';
            };            
            if (feature.target.feature.properties.image){
                content = content + "<img src=\""+feature.target.feature.properties.image+"\">";
            };  
            if (feature.target.feature.properties.contact){
                content = content + feature.target.feature.properties.contact;
            };  
            if (feature.target.feature.properties.ḑescription){
                content = content + feature.target.feature.properties.ḑescription;
            };  
            if (feature.target.feature.properties.services){
                content = content + "<h3>Services</h3>" + feature.target.feature.properties.services;
            };  
           if (feature.target.feature.properties.horaire){
                content = content + "<h3>Horaire</h3>" + feature.target.feature.properties.horaire;
            };  
            var popup = L.popup({maxWidth:450})
                .setLatLng(feature.target._latlng)
                .setContent(content)
                .openOn(projet.map);
        });
    };

    /*projet.layers.installations.defaultStyle = {
        radius: 8,
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    projet.layers.installations.invisibleStyle = {
        radius: 0,
        fillColor: "#ff7800",
        color: "#000",
        weight: 0,
        opacity: 0,
        fillOpacity: 0
    };*/

    projet.layers.installations.layer = L.geoJson(installations.features, {
        pointToLayer: function (feature, latlng) {
            if(feature.properties.type == 'ACC' || feature.properties.type == 'CHA' || feature.properties.type == 'REF'){
                var myIcon = L.icon({ 
                    iconUrl: "./img/"+feature.properties.type+".png",
                    iconSize: [30, 30]
                });
                return L.marker(latlng, {icon: myIcon})    
            };
            var myIcon = L.icon({ 
                    iconUrl: "./img/ACC.png",
                    iconSize: [0, 0]
            });
            return L.marker(latlng, {icon: myIcon}) 
            //return L.circleMarker(latlng, projet.layers.installations.defaultStyle);
        },
        onEachFeature: projet.layers.installations.onEachFeature,
        /*pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, map.geojsonLayer.installationsLayer.DefaultStyle);
        }*/
    }).addTo(projet.map);


    projet.map.on('zoomend ', function(e) {
         if ( projet.map._zoom < 11 ){ 
            projet.map.removeLayer( projet.layers.installations.layer );

        } else if ( projet.map._zoom == 11 ){ 
            projet.map.addLayer( projet.layers.installations.layer );
            projet.layers.installations.layer.eachLayer(function (layer) {
                if(layer.feature.properties.type == 'ACC') {
                    var myIcon = L.icon({ 
                        iconUrl: "./img/"+layer.feature.properties.type+".png",
                        iconSize: [30, 30]
                    });
                    layer.setIcon(myIcon);
                } else {
                    var myIcon = L.icon({ 
                        iconUrl: "./img/ACC.png",
                        iconSize: [0, 0]
                    });
                    layer.setIcon(myIcon);
                };
            });
        } else if ( projet.map._zoom == 12 ){ 
            projet.map.addLayer( projet.layers.installations.layer );
            projet.layers.installations.layer.eachLayer(function (layer) {
                if(layer.feature.properties.type == 'ACC' || layer.feature.properties.type == 'CHA' || layer.feature.properties.type == 'REF') {
                    var myIcon = L.icon({ 
                        iconUrl: "./img/"+layer.feature.properties.type+".png",
                        iconSize: [30, 30]
                    });
                    layer.setIcon(myIcon);
                } else {
                    var myIcon = L.icon({ 
                        iconUrl: "./img/ACC.png",
                        iconSize: [0, 0]
                    });
                    layer.setIcon(myIcon);
                };
            });
        } else if ( projet.map._zoom == 13 || projet.map._zoom == 14 ){ 
            projet.map.addLayer( projet.layers.installations.layer );
            projet.layers.installations.layer.eachLayer(function (layer) {
                if(layer.feature.properties.type == 'ACC' || layer.feature.properties.type == 'CHA' || layer.feature.properties.type == 'REF' || layer.feature.properties.type == 'CAM') {
                    var myIcon = L.icon({ 
                        iconUrl: "./img/"+layer.feature.properties.type+".png",
                        iconSize: [30, 30]
                    });
                    layer.setIcon(myIcon);
                } else {
                    var myIcon = L.icon({ 
                        iconUrl: "./img/ACC.png",
                        iconSize: [0, 0]
                    });
                    layer.setIcon(myIcon);
                };
            });
        } else if ( projet.map._zoom == 15 ){ 
            projet.map.addLayer( projet.layers.installations.layer );
            projet.layers.installations.layer.eachLayer(function (layer) {
                if(layer.feature.properties.type != 'YOU') {
                    var myIcon = L.icon({ 
                        iconUrl: "./img/"+layer.feature.properties.type+".png",
                        iconSize: [30, 30]
                    });
                    layer.setIcon(myIcon);
                } else {
                    var myIcon = L.icon({ 
                        iconUrl: "./img/ACC.png",
                        iconSize: [0, 0]
                    });
                    layer.setIcon(myIcon);
                };
            });
       } else { 
            projet.map.addLayer( projet.layers.installations.layer );
            projet.layers.installations.layer.eachLayer(function (layer) {
                var myIcon = L.icon({ 
                    iconUrl: "./img/"+layer.feature.properties.type+".png",
                    iconSize: [30, 30]
                });
                layer.setIcon(myIcon);
            });
        };



    });


});
