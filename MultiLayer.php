<?php
/**
 * PHP version of multilayer calculation,
 * How to use it, ajax call with IITC data, from return you will get multilayer data
 */
class MultiLayer
{
    protected $result = [];

    public function getPortalLinks ($jsonData) {
        ini_set('max_execution_time', 3000);

        $anchor = $jsonData->anchor;
        $items = $jsonData->items;

        $this->generateAnchorLinks($anchor, $items);
        $this->generatePortalLinks($anchor, $items);

        return $this;
    }

    private function generateAnchorLinks ($anchor, $items) {
        foreach ($items as $item) {
            $resultItem = [
                'type' => 'polyline',
                'latLngs' => [
                    [
                        'lat' => $anchor->lat / 1000000,
                        'lng' => $anchor->lng / 1000000
                    ],
                    [
                        'lat' => $item->coordinates->lat,
                        'lng' => $item->coordinates->lng,
                    ]
                ],
                'color' => '#000000'
            ];

            array_push($this->result, $resultItem);
        }
    }

    private function generatePortalLinks ($anchor, $items) {
        $linked = [];
        $linksDone = [];

        foreach ($items as $linkPortal) {
            array_push($linked, $linkPortal->guid);

            foreach ($items as $key => $j) {
                $canLink = true;

                if ((int)$key === 0 || in_array($j->guid, $linked)) continue;

                foreach ($items as $key2 => $j2) {
                    if ($j->guid != $j2->guid) {
                        if ($this->intersects(
                            $linkPortal->coordinates->lat, $linkPortal->coordinates->lng, $j->coordinates->lat, $j->coordinates->lng,
                            $j2->coordinates->lat, $j2->coordinates->lng, $anchor->lat / 1000000, $anchor->lng / 1000000
                        )) {
                            $canLink = false;
                        }

                        foreach ($linksDone as $linkDone) {
                            if ($this->intersects(
                                $linkPortal->coordinates->lat, $linkPortal->coordinates->lng, $j->coordinates->lat, $j->coordinates->lng,
                                $linkDone[0]['lat'], $linkDone[0]['lng'], $linkDone[1]['lat'], $linkDone[1]['lng']
                            )) {
                                $canLink = false;
                            }
                        }
                    }
                }

                if ($canLink){
                    $latLngs = [
                        [
                            'lat' => $j->coordinates->lat,
                            'lng' => $j->coordinates->lng
                        ],
                        [
                            'lat' => $linkPortal->coordinates->lat,
                            'lng' => $linkPortal->coordinates->lng,
                        ]
                    ];

                    array_push($this->result, [
                        'type' => 'polyline',
                        'latLngs' => $latLngs,
                        'color' => '#FE6E0E'
                    ]);

                    array_push($linksDone, $latLngs);
                }
            }
        }
    }

    private function intersects ($a, $b, $c, $d, $p, $q, $r, $s) {
        $det = ($c - $a) * ($s - $q) - ($r - $p) * ($d - $b);
        if ($det === 0) {
            return false;
        } else {
            $lambda = (($s - $q) * ($r - $a) + ($p - $r) * ($s - $b)) / $det;
            $gamma = (($b - $d) * ($r - $a) + ($c - $a) * ($s - $b)) / $det;
            return (0 < $lambda && $lambda < 1) && (0 < $gamma && $gamma < 1);
        }
    }

    public function getResult () {
        return $this->result;
    }
}