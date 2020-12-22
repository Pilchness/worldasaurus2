let countryDataArray = [];
let currentCountryData = {};
let currentCountryAdditionalData = {};

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
      currentCountryData = country;
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
      console.log(response);
      let currentCountryISOCode = response.data.results[0].components['ISO_3166-1_alpha-3'];
      handleNewCountryChosen(currentCountryISOCode);
      drawMapOutlineForCountry(currentCountryISOCode);
    },
    error: function (errorThrown) {
      console.log(errorThrown);
    }
  });
};

getUserLatLonCoords();

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

const addMarkerGroupToMap = (markerData) => {
  for (let i = 0; i < markerData.length; i++) {
    let a = markerData[i];
    let title = a[2];
    let marker = L.marker(L.latLng(a[0], a[1]), { title: title });
    marker.bindPopup(title);
    markers.addLayer(marker);
  }
};

const getCountryDataFromLocalJSON = async () => {
  try {
    await $.ajax({
      type: 'POST',
      url: 'libs/php/apicalls.php',
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
    url: 'libs/php/getCountryFlagData.php',
    dataType: 'json',
    data: { code: ISOcode },
    success: function (response) {
      currentCountryAdditionalData = response.data;
      console.log(currentCountryAdditionalData);
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

const addCapitalCityPin = () => {
  console.log(currentCountryData);
};

const drawMapPinsForCountry = () => {
  addCapitalCityPin();
  // addMarkerGroupToMap([
  //   [-37.8210922667, 175.2209316333, '2'],
  //   [-37.8210819833, 175.2213903167, '3'],
  //   [-37.8210881833, 175.2215004833, '3A'],
  //   [-37.8211946833, 175.2213655333, '1']
  // ]);
};

const handleNewCountryChosen = (isoCode) => {
  console.log(isoCode);
  drawMapOutlineForCountry(isoCode);
  drawMapPinsForCountry();
};

//country selector event handler
$('#country-selector').on('change', function () {
  handleNewCountryChosen(this.value);
});
