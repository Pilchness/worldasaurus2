<?php

$executionStartTime = microtime(true) / 1000;

switch($_REQUEST['api']) {
      case 'photos':
            $url = 'https://api.unsplash.com/search/photos?query=' . $_REQUEST['search'] . '&client_id=N9abUZxruGdM6PgpyQKXGJnYqq4I3vkcnx2-JcTNcyc&page=1&orientation=landscape';
            break;

      case 'weather':
            $url = 'http://api.weatherstack.com/current?access_key=4183de8b2d6245372e8faef0d3edb91d&query=' . $_REQUEST['search'];
            break;

      case 'currency':
            $url = 'https://free.currconv.com/api/v7/convert?q=USD_' . $_REQUEST['search'] . '&compact=ultra&apiKey=7cb4ce36c6434d315c08';
            break;

      case 'opencage':
             $url = 'https://api.opencagedata.com/geocode/v1/json?q=' . $_REQUEST['search']['latitude'] . '+' . $_REQUEST['search']['longitude'] . '&key=e6653782923143fba432e00a48a0f2fa';
             break;

      case 'rest':
            $url = 'https://restcountries.eu/rest/v2/alpha/' . $_REQUEST['search'];
            break;

      case 'wiki':
            switch($_REQUEST['query']) {
                  case 'currencyList':
                  $url = 'https://en.wikipedia.org/w/api.php?action=parse&format=json&page=List_of_circulating_currencies&section=2&prop=wikitext';
                  break;

                  case 'search':
                  $url = 'https://en.wikipedia.org/w/api.php?&action=query&list=search&srsearch=' . $_REQUEST['search'] . '&format=json';
                  break;

                  case 'summary':
                  $url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' . $_REQUEST['search'] . '?redirect=false';
                  break;

                  default: $url = '';
            }
            break;

      case 'geonames':
            switch($_REQUEST['query']) {
                  case 'cities':
                  $url = 'http://api.geonames.org/searchJSON?country=' . $_REQUEST['search']['isoA2'] . '&startRow=' . $_REQUEST['search']['row'] .'&maxRows=1000&formatted=true&lang=en&username=pilchness';
                  break;

                  case 'id':
                  $url = 'http://api.geonames.org/getJSON?geonameId=' . $_REQUEST['search'] . '&username=pilchness&style=full';
                  break;

                  case 'poi':
                  $url = 'http://api.geonames.org/searchJSON?country=' . $_REQUEST['search']['isoA2'] . '&featureClass=' . $_REQUEST['search']['class'] . '&maxRows=1000&formatted=true&lang=en&username=pilchness';
                  break;

                  default: $url = '';
            }
            break;

      default: $url = '';
          
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