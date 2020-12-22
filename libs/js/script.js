let countryDataArray = [];

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

const identifyCountry = (position) => {
  console.log(position);
  return $.ajax({
    type: 'POST',
    url: 'libs/php/getPlaceFromLatLong.php',
    dataType: 'json',
    data: { latitude: position.coords.latitude, longitude: position.coords.longitude },
    success: function (response) {
      let currentCountryISOCode = response.data.results[0].components['ISO_3166-1_alpha-3'];
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
const layer = L.geoJSON().addTo(map);

const getCountryDataFromLocalJSON = async () => {
  let geodata;
  try {
    geodata = await $.ajax({
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

const drawMapOutlineForCountry = (isoCode) => {
  layer.clearLayers();
  countryDataArray.forEach((country) => {
    if (country.properties.iso_a3 === isoCode) {
      const countryOutline = layer.addData(country, { style: { color: '#ff0000', weight: 10, opacity: 0.65 } });

      const countryBounds = countryOutline.getBounds();

      map.flyToBounds(countryBounds, 14, {
        animate: true,
        duration: 3
      });
    }
  });
};

//country selector event handler
$('#country-selector').on('change', function () {
  console.log(this.value);
  drawMapOutlineForCountry(this.value);
});
