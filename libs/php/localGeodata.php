<?php

$strJsonGeoData = json_decode(file_get_contents('../../data/countryBorders.geo.json'));

echo json_encode(['geoData' => $strJsonGeoData]);

?>
