/*eslint-disable*/

export const displayMap = function (locations) {
  console.log(2);
  mapboxgl.accessToken =
    'pk.eyJ1IjoiZmFpc2FsLWtuIiwiYSI6ImNrcjB0Z2NuZTF2M2UzMXFwb20xN2MxYmcifQ.6URv3dW1IFSDsuDJj0tLiQ';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/faisal-kn/ckr0tznue03pq17qoqacqirof',
    //   center: [-116.504146, 35.845208],
    //   zoom: 4,
  });
  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //Add marker to
    const el = document.createElement('div');
    el.className = 'marker';
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);
    //add popups
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>${loc.description}<p>`)
      .addTo(map);

    //extend map-bound to include the current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 250,
      bottom: 250,
      left: 150,
      right: 150,
    },
  });
};
