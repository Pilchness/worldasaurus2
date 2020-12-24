let countryDataArray = [];

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

const countryISOLookUp = {};
let currentModal = '';

//initiate Leaflet map
const map = L.map('mapid', { zoomControl: false }).setView([51.505, -0.09], 5);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution:
    '<span style="font-size: 7px">Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community</span>'
}).addTo(map);

//initiate layers and markers
const layer = L.geoJSON().addTo(map);
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

        if (clickDiff < 1000) {
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
          getAdditionalGeodata(a[4]).then((result) => {
            if (result.data.wikipediaURL) {
              let wikiLink = result.data.wikipediaURL;
              $('#poi-name').html(`<a href='https://${wikiLink}' target='_blank'>${a[2]}</a>`);
              if (wikiLink) {
                getWikiSummary(wikiLink.replace('en.wikipedia.org/wiki/', '')).then((result) => {
                  if (result.data.originalimage) {
                    $('#poi-image').attr('src', result.data.originalimage.source);
                    $('#poi-image').attr('alt', result.data.title);
                    $('#poi-image-link').attr('href', `https://${wikiLink}`);
                  }

                  if (result.data.extract) {
                    $('#poi-text').text(result.data.extract.substring(0, 300) + '..');
                    $('#poi-link').html(
                      `<a style="font-size: 12px" href='https://${wikiLink}' target='_blank'>Open Full Wikipedia Article (new tab)</a>`
                    );
                  }
                });
              }
            }
            $('#map-pin-modal').toggle();
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
  layer.clearLayers();
  countryDataArray.forEach((country) => {
    if (country.properties.iso_a3 === isoCode) {
      currentCountry.geoData = country;
      currentCountry.name = country.properties.name;
      currentCountry.iso_a2 = country.properties.iso_a2;
      currentCountry.iso_a3 = isoCode;
      getAdditionalCountryData(isoCode);
      const countryOutline = layer.addData(country, { style: { color: '#ff0000', weight: 10, opacity: 0.65 } });
      const countryBounds = countryOutline.getBounds();
      map.flyToBounds(countryBounds, 14, {
        animate: true,
        duration: 3
      });
    }
  });
};

const identifyCountry = (position) => {
  return $.ajax({
    type: 'POST',
    url: 'libs/php/getPlaceFromLatLong.php',
    dataType: 'json',
    data: { latitude: position.coords.latitude, longitude: position.coords.longitude },
    success: function (response) {
      let currentCountryISOCode = response.data.results[0].components['ISO_3166-1_alpha-3'];
      handleNewCountryChosen(currentCountryISOCode);
    },
    error: function (errorThrown) {
      console.log(errorThrown);
    }
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

const getAdditionalCountryData = (ISOcode) => {
  $.ajax({
    type: 'POST',
    url: 'libs/php/restCountries.php',
    dataType: 'json',
    data: { code: ISOcode },
    success: function (response) {
      console.log(response);
      currentCountry.fullName = response.data.name;
      currentCountry.borders = response.data.borders;
      currentCountry.currency = response.data.currencies[0];
      currentCountry.flagUrl = response.data.flag;
      currentCountry.population = response.data.population;
      currentCountry.region = response.data.region;
      currentCountry.area = response.data.area;
      currentCountry.capitalCity = response.data.capital;

      drawMapPinsForCountry();
    },
    error: function (errorThrown) {
      console.log(errorThrown);
    }
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

const getCityData = async (startRow) => {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: 'libs/php/geoNames.php',
      type: 'POST',
      dataType: 'json',
      data: {
        query: 'cities',
        isoA2: currentCountry.iso_a2,
        start: startRow
      },
      success: function (result) {
        resolve(result);
      },
      error: function (error) {
        reject(error);
      }
    });
  });
};

const getPoiData = async (category) => {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: 'libs/php/geoNames.php',
      type: 'POST',
      dataType: 'json',
      data: {
        query: 'poi',
        isoA2: currentCountry.iso_a2,
        class: category
      },
      success: function (result) {
        resolve(result);
      },
      error: function (error) {
        reject(error);
      }
    });
  });
};

const getAdditionalGeodata = async (geoId) => {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: 'libs/php/geoNames.php',
      type: 'POST',
      dataType: 'json',
      data: {
        query: 'id',
        id: geoId
      },
      success: function (result) {
        resolve(result);
      },
      error: function (error) {
        reject(error);
      }
    });
  });
};

const getWikiSummary = async (pageTitle) => {
  console.log(pageTitle);
  return new Promise((resolve, reject) => {
    $.ajax({
      url: 'libs/php/wikiPreview.php',
      type: 'POST',
      dataType: 'json',
      data: {
        pageTitle: pageTitle
      },
      success: function (result) {
        resolve(result);
      },
      error: function (error) {
        reject(error);
      }
    });
  });
};

const getWikiCurrencies = async () => {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: 'libs/php/wikiCurrencies.php',
      type: 'GET',
      success: function (result) {
        resolve(result);
      },
      error: function (error) {
        reject(error);
      }
    });
  });
};

const getPhotos = async (searchWord) => {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: 'libs/php/imageSearch.php',
      type: 'POST',
      dataType: 'json',
      data: {
        searchWord: searchWord.replace(/\s/g, '&') //change spaces to &
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

const getCurrency = async () => {
  return new Promise((resolve, reject) => {
    $.ajax({
      type: 'POST',
      url: 'libs/php/getCurrencyData.php',
      success: function (result) {
        resolve(result.data);
      },
      error: function (error) {
        reject(error);
      }
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
  getCityData(1).then((cities) => {
    currentCountry.mapPins.cities = cities.data.geonames;
    addMarkerGroup('P', 'city', 'cities');
    addMarkerGroup('AIRP', 'plane', 'cities');
  });
  getPoiData('H').then((pois) => {
    currentCountry.mapPins.geoH = pois.data.geonames;
    addMarkerGroup('LK', 'water', 'geoH');
    addMarkerGroup('RSV', 'water', 'geoH');
  });
  getPoiData('L').then((pois) => {
    currentCountry.mapPins.geoL = pois.data.geonames;
    addMarkerGroup('PRK', 'squirrel', 'geoL');
    addMarkerGroup('RESW', 'squirrel', 'geoL');
    addMarkerGroup('RESV', 'squirrel', 'geoL');
    addMarkerGroup('PRT', 'ship', 'geoL');
  });
  getPoiData('S').then((pois) => {
    currentCountry.mapPins.geoS = pois.data.geonames;
    addMarkerGroup('CH', 'church', 'geoS');
    addMarkerGroup('CTRR', 'church', 'geoS');
    addMarkerGroup('CMP', 'campground', 'geoS');
    addMarkerGroup('CSTL', 'fort-awesome', 'geoS');
    addMarkerGroup('FRM', 'tractor', 'geoS');
    addMarkerGroup('GDN', 'flower-tulip', 'geoS');
    addMarkerGroup('UNIV', 'university', 'geoS');
  });
  getPoiData('T').then((pois) => {
    currentCountry.mapPins.geoT = pois.data.geonames;
    addMarkerGroup('BCH', 'umbrella-beach', 'geoT');
    addMarkerGroup('DSRT', 'cactus', 'geoT');
    addMarkerGroup('MT', 'mountains', 'geoT');
  });
};

const handleNewCountryChosen = (isoCode) => {
  drawMapOutlineForCountry(isoCode);
};

const borderingCountries = () => {
  let borderText = '';
  currentCountry.borders.forEach((border) => {
    borderText += `<span id='${border}' class='border-list-item'>${countryISOLookUp[border]}</span>, `;
  });

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
  console.log(result[photoNumber]);
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
  getPhotos(currentCountry.name).then((result) => {
    let photoNumber = 0;
    $('#photo-left').css('visibility', 'hidden');
    displayPhotos(result, photoNumber);

    $('#photo-left').on('click', function () {
      $('#photo-right').css('visibility', 'visible');

      photoNumber--;
      if (photoNumber <= 0) {
        photoNumber = 0;
        $('#photo-left').css('visibility', 'hidden');
      }
      displayPhotos(result, photoNumber);
    });
    $('#photo-right').on('click', function () {
      $('#photo-left').css('visibility', 'visible');
      photoNumber++;
      if (photoNumber >= result.length - 1) {
        photoNumber = result.length - 1;
        $('#photo-right').css('visibility', 'hidden');
      }
      displayPhotos(result, photoNumber);
    });
  });
};

const prepareCurrencyModal = async () => {
  getCurrency().then((result) => {
    console.log(result);
    $('#country-currency-list').empty();
    $('#country-currency-list').append(`<li>Name: ${currentCountry.currency.name}</li>`);
    $('#country-currency-list').append(`<li>Symbol: ${currentCountry.currency.symbol}</li>`);
    $('#country-currency-list').append(`<li>Exchange Rate ($): ${result[currentCountry.currency.code]}</li>`);
    getWikiCurrencies().then((currencyData) => {
      const wikiCurrencyData = currencyData.wikitext['*'];
      let currencyNameIndex = wikiCurrencyData.indexOf(currentCountry.currency.code);
      let currencyInfoString = wikiCurrencyData.slice(currencyNameIndex - 150, currencyNameIndex);
      console.log(currencyInfoString);
      console.log(currencyInfoString.lastIndexOf('[['));
      let wikiCurrencyTitle = currencyInfoString.slice(
        currencyInfoString.lastIndexOf('[[') + 2,
        currencyInfoString.lastIndexOf(']]')
      );
      wikiCurrencyTitle = wikiCurrencyTitle.split(' ').join('_');
      if (wikiCurrencyTitle.indexOf('|') !== -1) {
        wikiCurrencyTitle = wikiCurrencyTitle.slice(0, wikiCurrencyTitle.indexOf('|'));
      }
      getWikiSummary(wikiCurrencyTitle).then((wiki) => {
        console.log(wiki);
        if (wiki.data) {
          let wikiLink = wiki.data.content_urls.desktop.page;
          if (wiki.data.originalimage) {
            $('#currency-image').attr('src', wiki.data.originalimage.source);
            $('#currency-image').attr('alt', wiki.data.title);
            $('#currency-image-link').attr('href', wikiLink);
          }

          if (wiki.data.extract) {
            $('#currency-text').text(wiki.data.extract.substring(0, 400) + '..');
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
  });
  $('#country-images-button, #close-country-images').on('click', function () {
    prepareCountryImagesModal();
    $('#country-images-modal').toggle();
  });
  $('#country-currency-button, #close-country-currency').on('click', function () {
    prepareCurrencyModal();
    $('#country-currency-modal').toggle();
  });
  $('#country-weather-button, #close-country-weather').on('click', function () {
    $('#country-weather-modal').toggle();
  });
  $('#settings-button, #close-settings').on('click', function () {
    $('#settings-modal').toggle();
  });

  // $('#close-side-info').on('click', function () {
  //   $('#info-modal').hide();
  // });
});
