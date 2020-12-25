class DataFetcher {
  constructor(type, api, query, search) {
    this.api = api;
    this.query = query;
    this.type = type;
    this.search = search;
  }

  dataFetch = async () => {
    return new Promise((resolve, reject) => {
      $.ajax({
        type: this.type,
        url: 'libs/php/getNewData.php',
        data: {
          api: this.api,
          query: this.query,
          search: this.search
        },
        success: function (result) {
          console.log(result);
          resolve(result.data);
        },
        error: function (error) {
          reject(error);
        }
      });
    });
  };
}

const photos = new DataFetcher('POST', 'photos', 'all', 'flag');
photos.dataFetch().then((result) => {
  console.log(result);
});

const weather = new DataFetcher('POST', 'weather', 'all', 'London');
weather.dataFetch().then((result) => {
  console.log(result);
});
