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
  mapPins: { airports: [{ lat: 0, lng: 0, name: '' }], cities: [] },
  population: 0,
  flagUrl: null,
  photoUrls: [],
  currency: { name: '', code: '', exchangeRate: 0 },
  weather: {}
};

// const cityIcon = L.divIcon({
//   html: '<i class="fa fa-city fa-2x"></i>',
//   iconSize: [10, 10],
//   className: 'myDivIcon'
// });

//initiate Leaflet map
const map = L.map('mapid', { zoomControl: false }).setView([51.505, -0.09], 5);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution:
    'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
}).addTo(map);

//initiate layers and markers
const layer = L.geoJSON().addTo(map);
const markers = L.markerClusterGroup();
map.addLayer(markers);

const addMarkerGroupToMap = (markerData, icon) => {
  console.log(icon);
  for (let i = 0; i < markerData.length; i++) {
    if (markerData[i]) {
      let a = markerData[i];
      //let title = a[2];
      let marker = L.marker(L.latLng(a[0], a[1]), {
        icon: L.divIcon({
          html: `<i class="fa fa-${icon} fa-2x"></i>`,
          iconSize: [10, 10],
          className: 'myDivIcon'
        })
      });
      //marker.bindPopup(title);
      marker.on('click', (e) => {
        console.log(a[2]);
        //console.log(e);
        //$('#map-pin-modal').toggle();
        //e.originalEvent.stopPropagation();
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

      //console.log(currentCountry);

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

// const addCityPin = (cityName) => {
//   $.ajax({
//     url: 'libs/php/getLatLongFromPlacename.php',
//     type: 'POST',
//     dataType: 'json',
//     data: {
//       city: cityName.replace(/ /g, '%20')
//     },

//     success: function (result) {
//       let coords = result.data.results[0].geometry;
//       currentCountry.mapPins.cities.push(result.data.results[0]);
//       addMarkerGroupToMap([[coords.lat, coords.lng, cityName]]);
//     },
//     error: function (error) {
//       console.log(error);
//     }
//   });
// };

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

const addMarkerGroup = (search, icon) => {
  console.log(search, icon);
  addMarkerGroupToMap(
    currentCountry.mapPins.cities.map((city) => {
      if (city.fcl === search || city.fcode === search) {
        return [city.lat, city.lng, city.name, city.population];
      } else return;
    }),
    icon
  );
};

const drawMapPinsForCountry = async () => {
  //addCityPin(currentCountry.capitalCity);
  getCityData(1).then((cities) => {
    console.log(cities);
    currentCountry.mapPins.cities = cities.data.geonames;
    addMarkerGroup('P', 'city');
    addMarkerGroup('AIRP', 'plane');
    addMarkerGroup('LKS', 'water');
    addMarkerGroup('HSP', 'hospital');
  });
};

const handleNewCountryChosen = (isoCode) => {
  drawMapOutlineForCountry(isoCode);
};

//country selector event handler
$('#country-selector').on('change', function () {
  handleNewCountryChosen(this.value);
});
