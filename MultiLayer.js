// ==UserScript==
// @id              iitc-plugin-multilayer
// @name            IITC plugin: Multilayer
// @category        Misc
// @version         1
// @description     Generate max fields based on one anchour portal
// @include         http*://*intel.ingress.com/*
// @match           http*://*intel.ingress.com/*
// @grant           XF
// @author          VeitsGeiOnOkei
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    window.plugin.multiLayer = function() {};

    window.plugin.multiLayer.createmenu = function() {

        if (!window.selectedPortal) {
            window.dialog({
                title: "Select portal",
                html: '<p>In order to generate multilayer, select anchor and draw polygon containing portals to be linked to anchor</p>',
                dialogClass: 'ui-dialog-multiExport'
            });

            return false;
        }

        var portals = window.portals;

        if(localStorage['plugin-draw-tools-layer']) {
            var drawLayer = JSON.parse(localStorage['plugin-draw-tools-layer']);
        }

        window.postAjax('getPortalDetails', {guid:window.selectedPortal}, function(data,textStatus,jqXHR) {
            var portalsInPolygon = [];
            //Link all portals in polygons to anchour
            for (var i in portals) {
                var p = window.portals[i];
                //var name = p.options.data.title;
                //var guid = p.options.guid;
                var latlng = p._latlng.lat + ',' +  p._latlng.lng;
                //var pimage = p.options.data.image;

                var portalInPolygon = false;
                for(var dl in drawLayer){
                    if(drawLayer[dl].type === 'polygon'){
                        if(window.plugin.multiLayer.portalinpolygon(latlng,drawLayer[dl].latLngs)){
                            portalInPolygon = true;
                            break;
                        }
                    }
                }

                if (!portalInPolygon){
                    continue;
                }

                var layer = L.geodesicPolyline([L.latLng(data.result[2]/1000000, data.result[3]/1000000), p._latlng], window.plugin.drawTools.lineOptions);
                var layerType = 'polyline';

                map.fire('draw:created', {
                    layer: layer,
                    layerType: layerType
                });

                portalsInPolygon.push(p);
            }

            var linked = [];
            var linkesDone = [];

            for (var linkPortal in portalsInPolygon) {
                var linkablePortal = portalsInPolygon[linkPortal];
                linked.push(linkablePortal.options.guid);

                for (var j in portalsInPolygon) {
                    var p1 = portalsInPolygon[j];
                    var canLink = true;

                    if (Number(j) === 0 || linked.indexOf(p1.options.guid) !== -1) continue;

                    for (var j2 in portalsInPolygon) {
                        var p2 = portalsInPolygon[j2];

                        if (p1.options.guid != p2.options.guid) {
                            //if no intersect link ahead, we create link to next portal
                            if (window.plugin.multiLayer.intersects(linkablePortal._latlng.lat*1000000, linkablePortal._latlng.lng*1000000, p1._latlng.lat*1000000, p1._latlng.lng*1000000, p2._latlng.lat*1000000, p2._latlng.lng*1000000, data.result[2], data.result[3])) {
                                canLink = false;
                            }

                            //if previously created links are not in our way, we allow link creation
                            for (var linkDoneIndex in linkesDone) {
                                var linkDone = linkesDone[linkDoneIndex];
                                if (window.plugin.multiLayer.intersects(
                                    linkablePortal._latlng.lat*1000000, linkablePortal._latlng.lng*1000000, p1._latlng.lat*1000000, p1._latlng.lng*1000000,
                                    linkDone[0].lat*1000000, linkDone[0].lng*1000000, linkDone[1].lat*1000000, linkDone[1].lng*1000000
                                )) {
                                    canLink = false;
                                }
                            }
                        }
                    }

                    if (canLink) {
                        var layer2 = L.geodesicPolygon([p1._latlng, linkablePortal._latlng, L.latLng(data.result[2]/1000000, data.result[3]/1000000)]);
                        var layerType2 = 'polygon';

                        map.fire('draw:created', {
                            layer: layer2,
                            layerType: layerType2
                        });
                        console.log('possible link created')
                        linkesDone.push([p1._latlng, linkablePortal._latlng]);
                    }
                }
            }
        })

    };

    window.plugin.multiLayer.portalinpolygon = function(portal,LatLngsObjectsArray)
    {
        var portalCoords = portal.split(',');

        var x = portalCoords[0], y = portalCoords[1];

        var inside = false;
        for (var i = 0, j = LatLngsObjectsArray.length - 1; i < LatLngsObjectsArray.length; j = i++) {
            var xi = LatLngsObjectsArray[i]['lat'], yi = LatLngsObjectsArray[i]['lng'];
            var xj = LatLngsObjectsArray[j]['lat'], yj = LatLngsObjectsArray[j]['lng'];

            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    };

    window.plugin.multiLayer.intersects = function (a,b,c,d,p,q,r,s) {
        var det, gamma, lambda;
        det = (c - a) * (s - q) - (r - p) * (d - b);
        if (det === 0) {
            return false;
        } else {
            lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
            gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
            return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
        }
    };

    var setup = function() {
        $("#toolbox").append("<a onclick=\"window.plugin.multiLayer.createmenu();\" title=\"Generate multilayers\">MultiLayer</a>");
    };

    setup.info = plugin_info;
    if(!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    if(window.iitcLoaded && typeof setup === 'function') setup();
}

var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
