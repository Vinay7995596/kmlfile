import React, { useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const KMLUploader = () => {
  const [fileContent, setFileContent] = useState(null);
  const [summary, setSummary] = useState(null);
  const [details, setDetails] = useState([]);
  const [mapData, setMapData] = useState([]);

  
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFileContent(e.target.result);
      }
    };
    reader.readAsText(file);
  };

  // Parse the KML file and extract element types
  const parseKMLSummary = () => {

    if (!fileContent) return;

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(fileContent, "text/xml");
    const elements = ["Placemark", "Folder", "Document", "Style", "LookAt", "LineString", "MultiGeometry"];
    const counts = {};

    elements.forEach((el) => {
      counts[el] = xmlDoc.getElementsByTagName(el).length;
    });

    setSummary(counts);
  };

  // Parse KML for Detailed Data and Map Integration
  const parseKMLDetails = () => {
    if (!fileContent) return;

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(fileContent, "text/xml");

    const placemarks = xmlDoc.getElementsByTagName("Placemark");
    const parsedDetails = [];
    const parsedMapData = [];

    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];

      // Find LineStrings
      const lineStrings = placemark.getElementsByTagName("LineString");
      for (let j = 0; j < lineStrings.length; j++) {
        const coordinates = lineStrings[j].getElementsByTagName("coordinates")[0]?.textContent?.trim();
        if (coordinates) {
          const coordsArray = parseCoordinates(coordinates);
          const length = calculateLineLength(coordsArray);
          parsedDetails.push({ type: "LineString", length });
          parsedMapData.push({ type: "LineString", coordinates: coordsArray });
        }
      }
    }

    setDetails(parsedDetails);
    setMapData(parsedMapData);
  };


 
  const parseCoordinates = (coordText) => {
    return coordText
      .trim()
      .split(/\s+/) // Split by spaces or newlines
      .map((coord) => {
        const parts = coord.split(",").map(Number);
        if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
          console.error("Invalid coordinate found:", coord);
          return null; // Skip invalid coordinates
        }
        return [parts[1], parts[0]]; // Convert [lng, lat] -> [lat, lng]
      })
      .filter((item) => item !== null); // Remove null values
  };
  

  // Calculate total length of a LineString
  const calculateLineLength = (coordinates) => {
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      totalDistance += haversineDistance(coordinates[i - 1], coordinates[i]);
    }
    return totalDistance;
  };

  // Haversine formula to calculate distances between points
  const haversineDistance = ([lat1, lon1], [lat2, lon2]) => {
    const R = 6371; // Radius of Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const clearDetails = () => {
    setSummary(null)
    setDetails([])
    setMapData([])
    setFileContent(null)
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>

      
      <input type="file" accept=".kml" onChange={handleFileUpload} />

      
      <button onClick={parseKMLSummary} style={{ marginLeft: "10px", padding: "5px 10px" }}>
        Summary
      </button>
      <button onClick={parseKMLDetails} style={{ marginLeft: "10px", padding: "5px 10px" }}>
        Detailed
      </button>
      <button onClick={clearDetails} style={{ marginLeft: "10px", padding: "5px 10px" }}>
        clear
      </button>

      
      {summary && (
        <div style={{ marginTop: "20px" }}>
          <h3>KML Summary</h3>
          <table border={1} cellPadding={5} cellSpacing={0} style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Element Type</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary).map(([type, count]) => (
                <tr key={type}>
                  <td>{type}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

  
      {details.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>Detailed Analysis</h3>
          <table border={1} cellPadding={5} cellSpacing={0} style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Element Type</th>
                <th>Total Length (km)</th>
              </tr>
            </thead>
            <tbody>
              {details.map((detail, index) => (
                <tr key={index}>
                  <td>{detail.type}</td>
                  <td>{detail.length.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      
      <div style={{ height: "400px", marginTop: "20px" }}>
        <MapContainer center={[0, 0]} zoom={2} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {mapData.map((item, index) =>
            item.type === "LineString" ? (
              <Polyline key={index} positions={item.coordinates} color="blue" />
            ) : (
              <Marker key={index} position={item.coordinates[0]}>
                <Popup>{item.type}</Popup>
              </Marker>
            )
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default KMLUploader;
