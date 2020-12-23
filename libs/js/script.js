let countryDataArray = [];

const currentCountry = {
  iso_a3: '',
  iso_a2: '',
  name: '',
  region: '',
  area: 0,
  borders: [],
  geoData: {},
  capitalCity: { lat: 0, lng: 0, name: '' },
  mapPins: { cities: [], pois: [] },
  population: 0,
  flagUrl: null,
  photoUrls: [],
  currency: { name: '', code: '', exchangeRate: 0 },
  weather: {}
};

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

const addMarkerGroupToMap = async (markerData, icon) => {
  console.log(icon);
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

        if (clickDiff < 150) {
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
                  console.log(result);
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
      currentCountry.name = response.data.name;
      currentCountry.borders = response.data.borders;
      currentCountry.currency.name = response.data.currencies[0].code;
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

const getPhoto = async (searchWord) => {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: 'libs/php/imageSearch.php',
      type: 'POST',
      dataType: 'json',
      data: {
        searchWord: searchWord.replace(/\s/g, '&') //change spaces to &
      },
      success: function (result) {
        resolve(result.data[0]);
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
  //addCityPin(currentCountry.capitalCity);
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
    console.log(pois.data.geonames);
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
    console.log(pois.data);
    addMarkerGroup('BCH', 'umbrella-beach', 'geoT');
    addMarkerGroup('DSRT', 'cactus', 'geoT');
    addMarkerGroup('MT', 'mountains', 'geoT');
  });
};

const handleNewCountryChosen = (isoCode) => {
  drawMapOutlineForCountry(isoCode);
};

$(document).ready(function () {
  $('#country-selector').on('change', function () {
    handleNewCountryChosen(this.value);
  });
  $('#close-poi-info').on('click', function () {
    $('#map-pin-modal').hide();
  });
});
