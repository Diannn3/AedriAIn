export function MapsApp() {
  return (
    <div className="maps-prototype" aria-label="Maps prototype">
      <div className="map-road map-road--a" /><div className="map-road map-road--b" />
      <span className="map-node map-node--1">HOME</span><span className="map-node map-node--2">DEST</span><span className="map-node map-node--3">CAFE</span><span className="map-node map-node--4">PARK</span>
      <div className="map-route" />
      <small>Prototype layer · generic MapLibre integration next</small>
    </div>
  );
}
