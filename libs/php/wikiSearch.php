<?php
/*
    search.php

    MediaWiki API Demos
    Demo of `Search` module: Search for a text or title

    MIT License
*/

$searchPage = $_REQUEST['search'];

$endPoint = "https://en.wikipedia.org/w/api.php";
$params = [
    "action" => "query",
    "list" => "search",
    "srsearch" => $searchPage,
    "format" => "json"
];

$url = $endPoint . "?" . http_build_query( $params );

$ch = curl_init( $url );
curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
$output = curl_exec( $ch );
curl_close( $ch );

$result = json_decode( $output, true );

if ($result['query']['search'][0]['title'] == $searchPage){
    echo "Your search page '" . $searchPage . "' exists on English Wikipedia" . "\n" ;
}