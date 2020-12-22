<?php

$executionStartTime = microtime(true) / 1000;

if($_REQUEST['query'] === 'cities') {
$url =
  'http://api.geonames.org/searchJSON?country=' . $_REQUEST['isoA2'] . '&formatted=true&lang=en&username=pilchness';
} else {
  $url = '';
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_URL, $url);

$result = curl_exec($ch);

curl_close($ch);

$decode = json_decode($result, true);

$output['status']['code'] = '200';
$output['status']['name'] = 'ok';
$output['status']['description'] = 'mission saved';
$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . ' ms';
$output['data'] = $decode;

header('Content-Type: application/json; charset=UTF-8');

echo json_encode($output);

?>