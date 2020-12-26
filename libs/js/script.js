let countryDataArray = [];
let outlineColor = '#00ff00';
function countryOutlineStyle() {
  return {
    fillColor: outlineColor,
    weight: 2,
    opacity: 1,
    color: 'black',
    //dashArray: '3',
    fillOpacity: 0.2
  };
}
let mapFlySpeed = 0.1;
let mapZoomSpeed = 1;

const currentCountry = {
  iso_a3: '',
  iso_a2: '',
  name: '',
  fullName: '',
  region: '',
  area: 0,
  borders: [],
  geoData: {},
  capitalCity: { lat: 0, lng: 0, name: '' },
  mapPins: { cities: [], pois: [] },
  population: 0,
  flagUrl: null,
  photoUrls: [],
  currency: '',
  weather: {}
};
class DataFetcher {
  constructor(type, api, query) {
    this.api = api;
    this.query = query;
    this.type = type;
  }

  dataFetch = async (search) => {
    return new Promise((resolve, reject) => {
      $.ajax({
        type: this.type,
        url: 'libs/php/getNewData.php',
        data: {
          api: this.api,
          query: this.query,
          search: search
        },
        success: function (result) {
          resolve(result.data);
        },
        error: function (error) {
          reject(error);
        }
      });
    });
  };
}

const photos = new DataFetcher('POST', 'photos', 'all');
const weather = new DataFetcher('POST', 'weather', 'all');
const currency = new DataFetcher('POST', 'currency', 'search');
const placeFromLatLng = new DataFetcher('POST', 'opencage', 'latlng');
const restCountries = new DataFetcher('POST', 'rest', 'iso');
const wikiCurrencyList = new DataFetcher('GET', 'wiki', 'currencyList');
const wikiSearchArticles = new DataFetcher('POST', 'wiki', 'search');
const wikiPageSummary = new DataFetcher('POST', 'wiki', 'summary');
const cityData = new DataFetcher('POST', 'geonames', 'cities');
const countryData = new DataFetcher('POST', 'geonames', 'id');
const poiData = new DataFetcher('POST', 'geonames', 'poi');

const countryISOLookUp = {};
let currentModal = '';

//initiate Leaflet map
const map = L.map('mapid', { zoomControl: false, zoomSnap: 0, minZoom: 2.1 }).setView([51.505, -0.09], 5);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution:
    '<span style="font-size: 7px">Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community</span>'
}).addTo(map);

//initiate layers and markers
let countryOutline = L.geoJSON().addTo(map);
const markers = L.markerClusterGroup();
map.addLayer(markers);

// Create additional Control placeholders
function addControlPlaceholders(map) {
  const corners = map._controlCorners;
  corners['verticalcenterleft'] = L.DomUtil.create('div', 'leaflet-verticalcenter', map._controlContainer);
}
addControlPlaceholders(map);

const buttons = [
  L.easyButton({
    id: 'country-info-button',
    states: [{ icon: 'fa-info' }]
  }),
  L.easyButton({
    id: 'country-images-button',
    states: [{ icon: 'fa-images' }]
  }),
  L.easyButton({
    id: 'country-currency-button',
    states: [{ icon: 'fa-dollar-sign' }]
  }),
  L.easyButton({
    id: 'country-weather-button',
    states: [{ icon: 'fa-cloud-sun-rain' }]
  }),
  L.easyButton({
    id: 'settings-button',
    states: [{ icon: 'fa-cog' }]
  }),
  L.easyButton({
    id: 'zoom-in-button',
    states: [{ icon: 'fa-search-plus' }]
  }),
  L.easyButton({
    id: 'zoom-out-button',
    states: [{ icon: 'fa-search-minus' }]
  })
];

L.easyBar(buttons).setPosition('verticalcenterleft').addTo(map);

const addMarkerGroupToMap = async (markerData, icon) => {
  for (let i = 0; i < markerData.length; i++) {
    if (markerData[i]) {
      let a = markerData[i];
      //a[0]=Lat, a[1]=Lng, a[2]=name, a[3]=population, a[4]= geo id
      let citySize = Math.floor(a[3] / 100000) + 2; //scale for icon size based on population
      let marker = L.marker(L.latLng(a[0], a[1]), {
        icon: L.divIcon({
          html: `<i class="fa fa-${icon} fa-${citySize}x" id=${a[4]} style="color: white"></i>`,
          iconSize: [20, 20],
          className: 'myDivIcon'
        })
      });
      let lastClick = Date.now();
      marker.on('click', (e) => {
        let thisClick = Date.now();
        let clickDiff = thisClick - lastClick;
        lastClick = thisClick;
        e.originalEvent.stopPropagation();

        if (clickDiff > 100) {
          $('#poi-image').removeAttr('src');
          $('#poi-image').attr('alt', '');
          $('#poi-link').empty();
          $('#poi-text').empty();
          $(`#${a[4]}`).css('color', 'rgba(63, 127, 191, 1)');
          map.panTo(marker.getLatLng());
          $('.myDivIcon').on('click', function () {
            $(`#${a[4]}`).css('color', 'white');
          });
          $('#poi-name').text(a[2]);
          $('#poi-coords-lat').text(`Lat: ${a[0]}`);
          $('#poi-coords-lng').text(`Lng: ${a[1]}`);
          if (a[3] > 0) {
            $('#poi-pop').text(`Population: ${a[3]}`);
          }
          countryData.dataFetch(a[4]).then((result) => {
            if (result.wikipediaURL) {
              let wikiLink = result.wikipediaURL;
              $('#poi-name').html(`<a href='https://${wikiLink}' target='_blank'>${a[2]}</a>`);
              if (wikiLink) {
                wikiPageSummary.dataFetch(wikiLink.replace('en.wikipedia.org/wiki/', '')).then((result) => {
                  if (result) {
                    if (result.originalimage) {
                      $('#poi-image').attr('src', result.originalimage.source);
                      $('#poi-image').attr('alt', result.title);
                      $('#poi-image-link').attr('href', `https://${wikiLink}`);
                    }

                    if (result.extract) {
                      $('#poi-text').text(result.extract.substring(0, 300) + '..');
                      $('#poi-link').html(
                        `<a style="font-size: 12px" href='https://${wikiLink}' target='_blank'>Open Full Wikipedia Article (new tab)</a>`
                      );
                    }
                  }
                });
              }
            }
            $('#map-pin-modal').show();
            $('#click-background').css('visibility', 'visible');
          });
        }
      });

      markers.addLayer(marker);
    }
  }
};

//preloader
$(window).on('load', function () {
  if ($('#preloader').length) {
    $('#preloader')
      .delay(100)
      .fadeOut('slow', function () {
        $(this).remove();
      });
  }
});

const getUserLatLonCoords = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(identifyCountry);
  }
};

const drawMapOutlineForCountry = (isoCode) => {
  countryOutline.clearLayers();
  $('#poi-image, #country-photo, #currency-image').attr(
    'src',
    'https://www.animatedimages.org/data/media/1667/animated-world-globe-image-0013.gif'
  );
  $('#country-facts-list, #country-photo-info, #country-currency-list').empty();
  countryDataArray.forEach((country) => {
    if (country.properties.iso_a3 === isoCode) {
      currentCountry.geoData = country;
      currentCountry.name = country.properties.name;
      currentCountry.iso_a2 = country.properties.iso_a2;
      currentCountry.iso_a3 = isoCode;
      getAdditionalCountryData(isoCode);
      countryOutline = L.geoJson(country, { style: countryOutlineStyle }).addTo(map);
      let countryBounds = countryOutline.getBounds();
      let neLatLng = countryBounds._northEast;
      let swLatLng = countryBounds._southWest;
      let latDifference = neLatLng.lat - swLatLng.lat;
      let lngDifference = neLatLng.lng - swLatLng.lng;
      let newNELat = neLatLng.lat + latDifference * (90 / (screen.height - 150));
      let newNELng = neLatLng.lng + lngDifference * (50 / (screen.width + 400));
      let newSWLat = swLatLng.lat - latDifference * (90 / (screen.height + 300));
      let newSWLng = swLatLng.lng - lngDifference * (50 / (screen.width - 120));
      countryBounds._northEast = { lat: newNELat, lng: newNELng };
      countryBounds._southWest = { lat: newSWLat, lng: newSWLng };

      map.flyToBounds(countryBounds, 0, {
        animate: true,
        duration: mapFlySpeed
      });
      $('#country-selector').val(currentCountry.iso_a3);
    }
  });
};

const identifyCountry = (position) => {
  placeFromLatLng
    .dataFetch({ latitude: position.coords.latitude, longitude: position.coords.longitude })
    .then((response) => {
      let currentCountryISOCode = response.results[0].components['ISO_3166-1_alpha-3'];
      handleNewCountryChosen(currentCountryISOCode);
    });
};

getUserLatLonCoords();

const getCountryDataFromLocalJSON = async () => {
  try {
    await $.ajax({
      type: 'POST',
      url: 'libs/php/localGeodata.php',
      dataType: 'json',
      data: { action: 'all' }
    }).then((countryObjectArray) => {
      countryDataArray = countryObjectArray.geoData.features;
      populateSearchElementInNavigationBar(countryDataArray);
    });
  } catch (error) {
    console.error(error);
  }
};

const getAdditionalCountryData = async (ISOcode) => {
  restCountries.dataFetch(ISOcode).then((response) => {
    currentCountry.fullName = response.name;
    currentCountry.borders = response.borders;
    currentCountry.currency = response.currencies[0];
    currentCountry.flagUrl = response.flag;
    currentCountry.population = response.population;
    currentCountry.region = response.region;
    currentCountry.area = response.area;
    currentCountry.capitalCity = response.capital;
    drawMapPinsForCountry();
  });
};

const sortAlphabeticalCountryNames = (countryDataArray) => {
  return countryDataArray.sort((a, b) => (a.properties.name > b.properties.name ? 1 : -1));
};

const populateSearchElementInNavigationBar = async (countryDataArray) => {
  sortAlphabeticalCountryNames(countryDataArray).forEach((countryDataObject) => {
    let countryName = countryDataObject.properties.name;
    let isoCode = countryDataObject.properties.iso_a3;
    $('#country-selector').append(`<option value="${isoCode}">${countryName}</option>`);
    countryISOLookUp[isoCode] = countryName;
  });
};

getCountryDataFromLocalJSON();

const displayCityMapPins = async (startRow) => {
  cityData.dataFetch({ isoA2: currentCountry.iso_a2, row: startRow }).then((result) => {
    currentCountry.mapPins.cities = result.geonames;
    addMarkerGroup('P', 'city', 'cities');
    addMarkerGroup('AIRP', 'plane', 'cities');
  });
};

const displayPoiData = async () => {
  poiData
    .dataFetch({ isoA2: currentCountry.iso_a2, class: 'H' })
    .then((result) => {
      currentCountry.mapPins.geoH = result.geonames;
      addMarkerGroup('LK', 'water', 'geoH');
      addMarkerGroup('RSV', 'water', 'geoH');
    })
    .then(() => {
      poiData.dataFetch({ isoA2: currentCountry.iso_a2, class: 'L' }).then((result) => {
        currentCountry.mapPins.geoL = result.geonames;
        addMarkerGroup('PRK', 'squirrel', 'geoL');
        addMarkerGroup('RESW', 'squirrel', 'geoL');
        addMarkerGroup('RESV', 'squirrel', 'geoL');
        addMarkerGroup('PRT', 'ship', 'geoL');
      });
    })
    .then(() => {
      poiData.dataFetch({ isoA2: currentCountry.iso_a2, class: 'S' }).then((result) => {
        currentCountry.mapPins.geoS = result.geonames;
        addMarkerGroup('CH', 'church', 'geoS');
        addMarkerGroup('CTRR', 'church', 'geoS');
        addMarkerGroup('CMP', 'campground', 'geoS');
        addMarkerGroup('CSTL', 'fort-awesome', 'geoS');
        addMarkerGroup('FRM', 'tractor', 'geoS');
        addMarkerGroup('GDN', 'flower-tulip', 'geoS');
        addMarkerGroup('UNIV', 'university', 'geoS');
      });
    })
    .then(() => {
      poiData.dataFetch({ isoA2: currentCountry.iso_a2, class: 'T' }).then((result) => {
        currentCountry.mapPins.geoT = result.geonames;
        addMarkerGroup('BCH', 'umbrella-beach', 'geoT');
        addMarkerGroup('DSRT', 'cactus', 'geoT');
        addMarkerGroup('MT', 'mountains', 'geoT');
      });
    });
};

const addMarkerGroup = (search, icon, dataLocation) => {
  addMarkerGroupToMap(
    currentCountry.mapPins[dataLocation].map((poi) => {
      if (poi.fcl === search || poi.fcode === search) {
        return [poi.lat, poi.lng, poi.name, poi.population, poi.geonameId];
      } else return;
    }),
    icon
  );
};

const drawMapPinsForCountry = async () => {
  displayCityMapPins(1);
  displayPoiData();
};

const handleNewCountryChosen = (isoCode) => {
  drawMapOutlineForCountry(isoCode);
};

const borderingCountries = () => {
  let borderText = '';
  if (currentCountry.borders.length < 1) {
    borderText = 'none  ';
  } else {
    currentCountry.borders.forEach((border) => {
      borderText += `<span id='${border}' class='border-list-item'>${countryISOLookUp[border]}</span>, `;
    });
  }

  return borderText.slice(0, -2);
};

const prepareCountryInfoModal = () => {
  $('.country-name').text(currentCountry.name);
  $('#country-flag').attr('src', currentCountry.flagUrl);
  $('#country-flag').attr('alt', `flag of ${currentCountry.name}`);
  $('#country-facts-list').empty();
  $('#country-facts-list').append(`<li>Region: ${currentCountry.region}</li>`);
  $('#country-facts-list').append(`<li>Area: ${currentCountry.area} km²</li>`);
  $('#country-facts-list').append(`<li>Capital City: ${currentCountry.capitalCity}</li>`);
  $('#country-facts-list').append(`<li>Population: ${currentCountry.population}</li>`);
  $('#country-facts-list').append(`<li>Borders: ${borderingCountries()}</li>`);
  $('.border-list-item').on('click', function (e) {
    handleNewCountryChosen(e.target.id);
    $('#country-info-modal').hide();
  });
};

const displayPhotos = (result, photoNumber) => {
  $('#country-photo').attr('src', result[photoNumber].urls.small);
  $('#country-photo').attr('alt', result[photoNumber].alt_description);
  $('#country-photo-info').empty();
  $('#country-photo-info').append(`<li>Description: ${result[photoNumber].alt_description}</li>`);
  $('#country-photo-info').append(`<li>Photographer: ${result[photoNumber].user.name}</li>`);
  $('#country-photo-info').append(`<li>Date: ${new Date(result[photoNumber].created_at).toString().slice(4, 15)}</li>`);
  if (result[photoNumber].user.portfolio_url) {
    $('#country-photo-info').append(
      `<li>Portfolio: <a href='${result[photoNumber].user.portfolio_url}' target='_blank'>${result[photoNumber].user.portfolio_url}</a></li>`
    );
  }
};

const prepareCountryImagesModal = async () => {
  photos.dataFetch(currentCountry.name.replace(/\s/g, '&')).then((response) => {
    let photoNumber = 0;
    let photoList = response.results;
    $('#photo-left').css('visibility', 'hidden');
    displayPhotos(photoList, photoNumber);

    $('#photo-left').on('click', function () {
      $('#photo-right').css('visibility', 'visible');

      photoNumber--;
      if (photoNumber <= 0) {
        photoNumber = 0;
        $('#photo-left').css('visibility', 'hidden');
      }
      displayPhotos(photoList, photoNumber);
    });
    $('#photo-right').on('click', function () {
      $('#photo-left').css('visibility', 'visible');
      photoNumber++;
      if (photoNumber >= photoList.length - 1) {
        photoNumber = photoList.length - 1;
        $('#photo-right').css('visibility', 'hidden');
      }
      displayPhotos(photoList, photoNumber);
    });
  });
};

const prepareCurrencyModal = async () => {
  currency.dataFetch(currentCountry.currency.code).then((result) => {
    let exchangeRate = result[Object.keys(result)[0]];
    $('#country-currency-list').empty();
    $('#country-currency-list').append(`<li>Name: ${currentCountry.currency.name}</li>`);
    $('#country-currency-list').append(`<li>Symbol: ${currentCountry.currency.symbol}</li>`);
    $('#country-currency-list').append(`<li>Exchange Rate ($): ${exchangeRate}</li>`);
    wikiCurrencyList.dataFetch().then((currencyData) => {
      const wikiCurrencyData = currencyData.parse.wikitext['*'];
      let currencyNameIndex = wikiCurrencyData.indexOf(currentCountry.currency.code);
      let currencyInfoString = wikiCurrencyData.slice(currencyNameIndex - 150, currencyNameIndex);
      let wikiCurrencyTitle = currencyInfoString.slice(
        currencyInfoString.lastIndexOf('[[') + 2,
        currencyInfoString.lastIndexOf(']]')
      );
      wikiCurrencyTitle = wikiCurrencyTitle.split(' ').join('_');
      if (wikiCurrencyTitle.indexOf('|') !== -1) {
        wikiCurrencyTitle = wikiCurrencyTitle.slice(0, wikiCurrencyTitle.indexOf('|'));
      }
      if (currentCountry.iso_a3 === 'GBR') {
        wikiCurrencyTitle = 'Pound_sterling';
      }
      wikiPageSummary.dataFetch(wikiCurrencyTitle).then((wiki) => {
        if (wiki) {
          let wikiLink = wiki.content_urls.desktop.page;
          if (wiki.originalimage) {
            $('#currency-image').attr('src', wiki.originalimage.source);
            $('#currency-image').attr('alt', wiki.title);
            $('#currency-image-link').attr('href', wikiLink);
          } else {
            $('#currency-image').removeAttr('src');
            $('#currency-image').removeAttr('alt');
          }

          if (wiki.extract) {
            $('#currency-text').text(wiki.extract.substring(0, 400) + '..');
            $('#currency-link').html(
              `<a style="font-size: 12px" href='${wikiLink}' target='_blank'>Open Full Wikipedia Article (new tab)</a>`
            );
          }
        }
      });
    });
    return result;
  });
};

const prepareWeatherModal = () => {
  weather.dataFetch(currentCountry.capitalCity).then((result) => {
    $('#country-weather-list').empty();
    $('#weather-symbol').attr('src', result.current.weather_icons[0]);
    $('#weather-symbol').attr('alt', result.current.weather_descriptions[0]);
    $('#country-weather-list').append(`<li>Current weather in ${currentCountry.capitalCity}:</li>`);
    $('#country-weather-list').append(
      `<li>Temperature: ${result.current.temperature}° (feels like ${result.current.feelslike}°)</li>`
    );
    $('#country-weather-list').append(`<li>Humidity: ${result.current.humidity}</li>`);
    $('#country-weather-list').append(`<li>Precipitation: ${result.current.precip}</li>`);
    $('#country-weather-list').append(`<li>Visibility: ${result.current.visibility}</li>`);
    $('#country-weather-list').append(`<li>Cloud cover: ${result.current.cloudcover}</li>`);
    $('#country-weather-list').append(`<li>Windspeed: ${result.current.wind_speed}</li>`);
    $('#country-weather-list').append(`<li>Wind direction: ${result.current.wind_dir}</li>`);

    photos
      .dataFetch(`weather ${currentCountry.name} ${currentCountry.capitalCity}`.replace(/\s/g, '&')) //replace any spaces with &
      .then((response) => {
        let randomImage = Math.floor(Math.random() * 10);
        let imageData = response.results[randomImage];
        $('#weather-image').attr('src', imageData.urls.small);
        $('#weather-image').attr('alt', imageData.alt_description);
        $('#weather-image').on('click', function () {
          if ($('#country-weather-list').is(':visible')) {
            $('#country-weather-list').hide();
            $('#weather-photo-info').empty();
            $('#weather-photo-info').append(`<li>Description: ${imageData.alt_description}</li>`);
            $('#weather-photo-info').append(`<li>Photographer: ${imageData.user.name}</li>`);
            $('#weather-photo-info').append(`<li>Date: ${new Date(imageData.created_at).toString().slice(4, 15)}</li>`);
            if (imageData.user.portfolio_url) {
              $('#weather-photo-info').append(
                `<li>Portfolio: <a href='${imageData.user.portfolio_url}' target='_blank'>${imageData.user.portfolio_url}</a></li>`
              );
            }
            $('#weather-photo-info').show();
          } else {
            $('#country-weather-list').show();
            $('#weather-photo-info').hide();
          }
        });
      });
  });
};

$(document).ready(function () {
  $('#country-selector').on('change', function () {
    handleNewCountryChosen(this.value);
  });
  $('#close-poi-info').on('click', function () {
    $('#map-pin-modal').hide();
  });
  $('#country-info-button, #close-country-info').on('click', function () {
    prepareCountryInfoModal();
    $('#country-info-modal').toggle();
    $('#click-background').css('visibility', 'visible');
  });
  $('#country-images-button, #close-country-images').on('click', function () {
    prepareCountryImagesModal();
    $('#country-images-modal').toggle();
    $('#click-background').css('visibility', 'visible');
  });
  $('#country-currency-button, #close-country-currency').on('click', function () {
    prepareCurrencyModal();
    $('#country-currency-modal').toggle();
    $('#click-background').css('visibility', 'visible');
  });
  $('#country-weather-button, #close-country-weather').on('click', function () {
    prepareWeatherModal();
    $('#country-weather-modal').toggle();
    $('#click-background').css('visibility', 'visible');
  });
  $('#settings-button, #close-settings').on('click', function () {
    $('#settings-modal').toggle();
    $('#click-background').css('visibility', 'visible');
  });
  $('#zoom-in-button').on('click', function () {
    map.flyTo(map.getCenter(), map.getZoom() + 0.5, {
      animate: true,
      duration: mapZoomSpeed
    });
  });
  $('#zoom-out-button').on('click', function () {
    map.flyTo(map.getCenter(), map.getZoom() - 0.5, {
      animate: true,
      duration: mapZoomSpeed
    });
  });
  $('#click-background').on('click', function () {
    console.log('clicked');
    $('#map-pin-modal').hide();
    $('#country-info-modal').hide();
    $('#country-images-modal').hide();
    $('#country-currency-modal').hide();
    $('#country-weather-modal').hide();
    $('#settings-modal').hide();
    $('#click-background').css('visibility', 'hidden');
  });
});
