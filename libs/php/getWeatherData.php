<?php

$executionStartTime = microtime(true) / 1000;

$url = 'http://api.weatherstack.com/current?access_key=4183de8b2d6245372e8faef0d3edb91d&query=' . $_REQUEST['city'];

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
