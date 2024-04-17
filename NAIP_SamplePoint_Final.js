// NAIP_SamplePoint_Final
// This is a Google earth engine script for labeling sampling points to create a reference for testing classifications. Points are labeled as water or not water.

// Version:24
// Edited by André February 2, 2024
// Updated to fix:
      // v24:
      // - Reordered sample points to the random column in ascending order.
      // v23:
      // - Added sample points as an asset instead of generating them in script
      // v22:
      // - Udated NDWI max saturation to 0.4 from 0.2. Helps differentiate surface cover in wetter areas like edge of waterbodies, low salt marsh, and irrigated fields.
      // v21:
      // - Updated color of buttons to help differentiation. And to see when buttons are active.
      // - Added a textbox to manually enter the point id. This will make it easier to find your point when there are lots of points.
      // - Optimized Save button by minimizing calls of getInfo
      // - Optimized Next Point button by using NumPoints object in code
      // - Optimized how places is created to speed up code.
      // - Added code to clear the export table after clicking export table. Fixed bug of repeat entries in export table
      // - Changed the creation of list and r to optimize code for faster running
      // v20:
      // - Added flooded fields as a waterbody option
      // v19:
      // - Added new binary map. One asset with 6 bands, each band for one time point. This resolves the binary maps being misaligned from the strata map and each other.
      // v18:
      // - Swapped reclassified binary maps with original binary maps.
      // - Added -1 when getting Y value from binary maps so that there is a reclass of 1-nonwater, 2-water -> 0-nonwater, 1-water
      // v17:
      // - Added additonal column (Pond_Presence) to export table that will record a 1 for every selection of 'water - pond'
      // - Updated the Certainty dropdown so that if Uncertain is chosen, the waterbody dropdown changes to include options that allow the interpreter to id which waterbody they're uncertain about.
      // - Made Save button font orange. And dropdown buttons a dark grey when unselected, and black when selected.
      // v16:
      // - Updated number of sample point to 1065.
      // v15:
      // - When exporting table the name of the file will be automatically populated with the first and last point of the table, current date, and labeler name.
      // - Interface will now change map and year on dropdown to the following year when you click the save button.
      // - Fixed bug of points saving with wrong ID if panel_t (sample point entry panel) was not closed
      // - Bug was fixed by incorporating the Map click function into the function of the dropdown menu of point IDs.
      // - No longer need to click on sample points, interface opens automatically when point ID selected or Next Point button pressed.
      // - Updated water? Dropdown menu text to include water. 
      // - Removed X textbox, when water? dropdown selected, the information is saved as a binary (0 = not water, 1 = all water options) and also in a second column as the text from the water? Dropdown menu
      // - Made all entries of sample point interface dropdown menus except for notes.
      // - Removed commented blocks of old code.
      // v14:
      // - Added new binary threshold images and new strata map.
      // - Updated name of bands used for new assets.
      // - Updated 2021 image to use the 2021 BT instead of 2018.
      // - Replaced GEE collection of NAIP images with NAIP images we georefrenced and reprojected to Mass. State Plane.
      // - Clipped NAIP assets to boundary table
      // v13:
      // - If a point at a certain time point that was already saved is saved again, it will overwrite the previous information on the exported table. Can now fix points that were incorrectly entered.
      // v12:
      // - The sample points are randomized after merging, so that strata are in random order instead of sequential.
      // - Created a dropdown textbox for Waterbodies. If not selected it will save as blank.
      // - Made subtable narrower
      // v11:
      // - Program does not crash when selecting last point. And points continue to be labeled index + 1 (1-50 instead of 0-49)
      // - Dropdown menu number updates when clicking the Next Point button.

// Code Start-----------------------------------------------------------------------

// Added 8/8/23 New binary map to resolve misalignment with strata and binaries
// Clip the BT_all image with the boundary
var BT_all = BT_all.clip(boundary);

// CLIP NAIP images
// Added 7/25/23 to clip imported NAIP assets
var NAIP_2010 = NAIP_2010.clip(boundary);
var NAIP_2012 = NAIP_2012.clip(boundary);
var NAIP_2014 = NAIP_2014.clip(boundary);
var NAIP_2016 = NAIP_2016.clip(boundary);
var NAIP_2018 = NAIP_2018.clip(boundary);
var NAIP_2021 = NAIP_2021.clip(boundary);

// CREATE NDWI images
// updated to work with imported NAIP assets 7/25/23:
var NDWI_2010 = NAIP_2010.normalizedDifference(['b2', 'b4']);
var NDWI_2012 = NAIP_2012.normalizedDifference(['b2', 'b4']);
var NDWI_2014 = NAIP_2014.normalizedDifference(['b2', 'b4']);
var NDWI_2016 = NAIP_2016.normalizedDifference(['b2', 'b4']);
var NDWI_2018 = NAIP_2018.normalizedDifference(['b2', 'b4']);
var NDWI_2021 = NAIP_2021.normalizedDifference(['b2', 'b4']);

// Visual Palette-----------------------------------------------------------------------
// updated to work with imported NAIP assets 7/25/23
// var naVis = {bands: ['R', 'G', 'B'], min: 0, max: 255};
 var naVis = {bands: ['b1', 'b2', 'b3'], min: 0, max: 255};   // True color
// var fcVis = {bands: ['N', 'R', 'G'], min: 0, max: 255};
 var fcVis = {bands: ['b4', 'b1', 'b2'], min: 0, max: 255};   // False color
 var ndwiVis = {min: -0.2, max: 0.4, palette: ['white', 'blue']};  // NDWI // Changed to 0.4 saturation for ndwi 8/21/23
 var highlight = {color: 'fdff32'};
 
//extract pixel values = 1-----------------------------------------------------------
// Updated to work with new strata map. 7/25/23
// Define classes of strata map
var alP = strata.updateMask(strata.select('b1').eq(2));
var alA = strata.updateMask(strata.select('b1').eq(1));
var gain = strata.updateMask(strata.select('b1').eq(4));
var loss = strata.updateMask(strata.select('b1').eq(3));
var other = strata.updateMask(strata.select('b1').eq(5));
//Map.addLayer(alA1, straVis,'Always Absense');

//get points coordinate----------------------------------------------------------------
var randomPoints = samplePoints.sort('random'); // Order points by random column
var pointsGeometry = randomPoints.geometry();
var pointsCoordinate = pointsGeometry.coordinates();
//print(pointsCoordinate)

//extract sample point id numbers ----------------------------------------------------------------------
//Changed 8/17/23 for faster running
// Initialize an empty list.
var list = [];
var r = [];   // point id number

// Get the length of the 'pointsCoordinate' array once.
var numPoints = ee.Number(pointsCoordinate.length()).getInfo();

// Loop through each point in the 'pointsCoordinate' array.
for (var i = 0; i < numPoints; i++) {
  // Convert each value from 'pointsCoordinate' to an Earth Engine list and store it directly in 'list'.
  list[i] = ee.List(ee.Number(pointsCoordinate.get(i)));
  
  // Assign a point id number to each point, starting from 1 (instead of 0).
  r[i] = i + 1;
}


//print('list', list);
//print('r', r);


//create table--------------------------------------------------------------------


var labeler;                           // labeler name
var title = ui.Label('Please enter your name:', {
    fontWeight: 'bold',  // Set text to bold
    backgroundColor: '#f3eddd'});  // Set background text color;   // initial panel label
var textbox_n = ui.Textbox({      // initial panel textbox for labeler name 
  placeholder: 'Name',
  onChange: function(text) {
    labeler = ee.String(text).getInfo();
    Map.remove(panel_n);
    var dataTable = [      // dataTable that will be exported
      // create data table columns
    ['Stratum',     
    'PointID',
    'PointID_R',
    'Latitude',
    'Longitude',
    'Year',
    'Certain',
    'Waterbody',   // added waterbody
    'X',
    'Y',
    'Note'
    ]];
    
  var subdataTable = [    // mini table on bottom left to follow updates
  //subdata table columns
    ['PointID',          // Andre changed to point ID, point_ID_R was showing index
    'Year',
    'Certain',
    'Waterbody'   // added waterbody
    ]
  ];
          
  
  
  var fc = ee.FeatureCollection([]);
  
  
  // export table button (bottom right)
  var b_e = ui.Button({
            label: 'Export Table',
            onClick: function() {
              for (var i = 1; i< ee.Number(dataTable.length).getInfo(); i++){
                var fc_point = ee.FeatureCollection([
                  ee.Feature(null, {
                    // get row values for each point
                    'Labeler': labeler,   // get labeler name from textbox entry
                    'Stratum': ee.List(ee.List(dataTable).get(i)).get(0),
                    'PointID': ee.List(ee.List(dataTable).get(i)).get(1),
                    'PointID_R': ee.List(ee.List(dataTable).get(i)).get(2),
                    'Latitude': ee.List(ee.List(dataTable).get(i)).get(3),
                    'Longitude': ee.List(ee.List(dataTable).get(i)).get(4),
                    'Year': ee.List(ee.List(dataTable).get(i)).get(5),
                    'Certain': ee.List(ee.List(dataTable).get(i)).get(6),
                    'Waterbody': ee.List(ee.List(dataTable).get(i)).get(7),
                    'Reference_X': ee.List(ee.List(dataTable).get(i)).get(8),   // added waterbody
                    'Map_Y': ee.List(ee.List(dataTable).get(i)).get(9),
                    'Pond_Presence': ee.List(ee.List(dataTable).get(i)).get(10),  // added pond presence 7/31/23
                    'Note': ee.List(ee.List(dataTable).get(i)).get(11)
                  })
                  ]);
                  
                    fc = fc.merge(fc_point);
              }
              
              //print(fc);
                        
              //Added 7/28/23 to change the table name to automatically update with the first and last sample points saved and the date
              // Get the PointID of the first and last sample points
              var firstPointID = dataTable[1][1]; // Assuming PointID is in the third column (index 2) of the dataTable
              var lastPointID = dataTable[dataTable.length - 1][1];
              
              
              // ADDED 7/31 to adjust for EST:
              // Get the current date in the user's local time zone
              var currentDateLocal = new Date();
              
              // Adjust for Eastern Standard Time (EST) with Daylight Saving Time (EDT)
              var timeZoneOffset = currentDateLocal.getTimezoneOffset();
              currentDateLocal.setMinutes(currentDateLocal.getMinutes() - timeZoneOffset);
              var isDaylightSavingTime = new Date().getTimezoneOffset() < timeZoneOffset;
              
              // If Daylight Saving Time (EDT) is in effect, add 1 hour (60 minutes)
              if (isDaylightSavingTime) {
                currentDateLocal.setMinutes(currentDateLocal.getMinutes() + 60);
              }
              
              // Convert to string in UTC format
              var currentDate = currentDateLocal.toISOString().split('T')[0];


              // Format the description of exporting table with the PointIDs, current date, and labeler name
              var tableName = 'Points' + firstPointID + '-' + lastPointID + '_' + currentDate + '_' + labeler; 
              
              // create table on google drive
              Export.table.toDrive({
                collection: fc.sort('PointID'),      // sample points saved
                description: tableName,
                folder: 'Sample_points_Table',
                fileFormat: 'CSV',
                selectors: ['Labeler', 'Stratum', 'PointID', 'Latitude','Longitude','Year','Certain','Waterbody','Reference_X', 'Map_Y', 'Pond_Presence', 'Note']  // added waterbody and ponds
              });
              
              //Added 8/17/23 to fix bug of doubles in export table
              // Clear the feature collection to prevent joining with new data next time
              fc = ee.FeatureCollection([]);
             }});
            
            
  
  backgroundColor: '#f3eddd80' // Hex code with 25% transparency

  // table of subdata update table
  var chart = ui.Chart(subdataTable).setChartType('Table');
  // create panel of subdata table
  var panel_dt = ui.Panel(); 
  // set size of subdata update table
  panel_dt.style().set({
    width: '400px',         // made smaller
    height: '155px',
    padding: '0px', // Remove the border
    backgroundColor: '#f3eddd80', // Hex code with 25% transparency
    position: 'bottom-left'
  });
  panel_dt.add(chart);  // add table to panel
  Map.add(panel_dt);    // add panel to map
  
  // create panel for export table button
  var panel_e = ui.Panel({
      widgets: [
          b_e     // export table button
      ],
      style: {
          position: 'bottom-right',
          color: '#03925e',
          padding: '0px', // Remove the border
          backgroundColor: '#00000000' // Hex code with alpha value 0 for transparent background
      }
  });
  Map.add(panel_e);  // add export table panel to map
  
  
  //create ui select widget---------------------------------------------------------
  
  // Updated to optimize code 8/17/23
  // Get the 'pointsCoordinate' array as a regular JavaScript array
  var pointsArray = pointsCoordinate.getInfo();
  
  // Initialize an empty object for 'places'.
  var places = {};
  
  
  // Loop through each point in the 'pointsCoordinate' array.
  for (var i = 0; i < numPoints; i++) {
    // Get the coordinate values from the 'pointsArray' and store them in 'places'.
    var coordinate = pointsArray[i];
    places[i] = [coordinate[0], coordinate[1]];
  }
  
  //print(pointsArray);
  //print(places);
  
  var centerP_lon, centerP_lat,point_lon, point_lat,point_ID,point_ID_R,stra;
  
  
  // get current point number
  var CurrentPoint = ee.Geometry.Point(
    [ee.Number(places[1][0]).getInfo(), ee.Number(places[1][1]).getInfo()]);
  Map.addLayer(CurrentPoint, {palette: 'FFFFFF'},'CurrentPoint');
  
  var layers = Map.layers();
  var n_layers = ee.Number(layers.length()).getInfo();
  
  var removeLayer = function(){
    var layer = layers.get(n_layers-1);
    Map.remove(layer);
  };
  
  var removeAllLayers = function(){
    for(var l = n_layers-1; l > -1; l--){
    var layer = layers.get(l);
    Map.remove(layer); 
    }
  };
  
  // Select point dropdown menu and sample point entry panel creation (panel_t)
  
  // years for dropdown menu of interface
  var years = {
    2010: [],
    2012: [],
    2014: [],
    2016: [],
    2018: [],
    2021: [],
  };
  var dataTable1;
  var op,t1,c1,c2,year,t0,t2,t3,st,no, y_status; 
  
  
  // the next lines (268-274) were added by Andre, they add 1 to each number in the dropdown menu so that it displays 1-50 instead of 0-49 
  // Code for dropdown menu of sample points
  var select = ui.Select({
    items: Object.keys(places).map(function(key) {
      return {
        label: (parseInt(key) + 1).toString(), // get point id as text 
        value: key      // get point id
      };
    }),    
    // what happens when point selected
    // Function for what happens when change to a new sample point
    onChange: function(key) {
      op = ee.Number.parse(key).getInfo();    // populate op with point index
      label_cp.setValue('Current Point: ' + (op + 1));  // changes current point label to reflect index + 1
      point_ID_R = key;                            
      point_ID = r[key];                             
      t1 = ee.String(point_ID_R);
      
      // André added, June 13 so that stratum column is populated by the actual point's property
       var currentFeature = ee.Feature(randomPoints.toList(randomPoints.size()).get(op));
       stra = ee.String(currentFeature.get('stratum')); // Retrieve the 'stratum' property from the current feature
  
      // zoom to point and get point coordinates
      point_lon = places[key][0];  // get longitude
      point_lat = places[key][1];  // get latitude
      Map.setCenter(places[key][0], places[key][1],19);   //zoom map
      removeLayer();
      CurrentPoint = ee.Geometry.Point(
        [ee.Number(places[key][0]).getInfo(), ee.Number(places[key][1]).getInfo()]);
        Map.addLayer(ee.FeatureCollection(CurrentPoint).style(highlight), {},'CurrentPoint'); // add points to map
  
  
  // 7/27/23 Incorporated panel_t creation into select dropdown menu so that you don't have to click on a point
  // get point info from selecting dropdown
          c1 = ee.Number(point_lat);
          c2 = ee.Number(point_lon);
          t0 = ee.Number(point_ID);
          st = ee.String(stra);     // stratum
          no = ee.String('');      // notes
          var y_point = ee.Geometry.Point(
        [ee.Number(point_lon).getInfo(), ee.Number(point_lat).getInfo()]);
  
  // Updated August 8, 2023 to work with BT_all new binary map. Fixes binary misalignment from strata.
  // function for updating map layers when year change
      function updateMapDisplay(key) {
        year = ee.String(key);
        var clayers = Map.layers();
        if(key == 2010){
          var y_2010 = BT_all.select('b1').reduceRegion({
            geometry: y_point,
            scale: 0.6,   // resolution
            reducer: ee.Reducer.mean()});
          y_status = y_2010.get('b1');     
          
          if(clayers.get(0)){
            removeAllLayers();
            Map.addLayer(NAIP_2010, naVis, 'TrueColor-2010');
            Map.addLayer(NAIP_2010, fcVis, 'FalseColor-2010',false);
            Map.addLayer(NDWI_2010, ndwiVis, 'NDWI-2010',false);
            Map.addLayer(randomPoints,{palette: 'FFFFFF'}, 'Points');
            Map.addLayer(ee.FeatureCollection(CurrentPoint).style(highlight), {},'CurrentPoint');
          } else {
            Map.addLayer(NAIP_2010, naVis, 'TrueColor-2010');
            Map.addLayer(NAIP_2010, fcVis, 'FalseColor-2010',false);
            Map.addLayer(NDWI_2010, ndwiVis, 'NDWI-2010',false);
            Map.addLayer(randomPoints,{palette: 'FFFFFF'}, 'Points');
            Map.addLayer(ee.FeatureCollection(CurrentPoint).style(highlight), {},'CurrentPoint');}
          } else if(key == 2012){
            var y_2012 = BT_all.select('b2').reduceRegion({
            geometry: y_point,
            scale: 0.6,
            reducer: ee.Reducer.mean()});
          y_status = y_2012.get('b2');    
          
            removeAllLayers();
            Map.addLayer(NAIP_2012, naVis, 'TrueColor-2012');
            Map.addLayer(NAIP_2012, fcVis, 'FalseColor-2012',false);
            Map.addLayer(NDWI_2012, ndwiVis, 'NDWI-2012',false);
            Map.addLayer(randomPoints,{palette: 'FFFFFF'}, 'Points');
            Map.addLayer(ee.FeatureCollection(CurrentPoint).style(highlight), {},'CurrentPoint');
          } else if(key == 2014){
            var y_2014 = BT_all.select('b3').reduceRegion({
            geometry: y_point,
            scale: 0.6,
            reducer: ee.Reducer.mean()});
          y_status = y_2014.get('b3');  
          
            removeAllLayers();
            Map.addLayer(NAIP_2014, naVis, 'TrueColor-2014');
            Map.addLayer(NAIP_2014, fcVis, 'FalseColor-2014',false);
            Map.addLayer(NDWI_2014, ndwiVis, 'NDWI-2014',false);
            Map.addLayer(randomPoints,{palette: 'FFFFFF'}, 'Points');
            Map.addLayer(ee.FeatureCollection(CurrentPoint).style(highlight), {},'CurrentPoint');
          } else if(key == 2016){
            var y_2016 = BT_all.select('b4').reduceRegion({
            geometry: y_point,
            scale: 0.6,
            reducer: ee.Reducer.mean()});
          y_status = y_2016.get('b4');     
          
            removeAllLayers();
            Map.addLayer(NAIP_2016, naVis, 'TrueColor-2016');
            Map.addLayer(NAIP_2016, fcVis, 'FalseColor-2016',false);
            Map.addLayer(NDWI_2016, ndwiVis, 'NDWI-2016',false);
            Map.addLayer(randomPoints,{palette: 'FFFFFF'}, 'Points');
            Map.addLayer(ee.FeatureCollection(CurrentPoint).style(highlight), {},'CurrentPoint');
          } else if(key == 2018){
            var y_2018 = BT_all.select('b5').reduceRegion({
            geometry: y_point,
            scale: 0.6,
            reducer: ee.Reducer.mean()});
          y_status = y_2018.get('b5');    
          
            removeAllLayers();
            Map.addLayer(NAIP_2018, naVis, 'TrueColor-2018');
            Map.addLayer(NAIP_2018, fcVis, 'FalseColor-2018',false);
            Map.addLayer(NDWI_2018, ndwiVis, 'NDWI-2018',false);
            Map.addLayer(randomPoints,{palette: 'FFFFFF'}, 'Points');
            Map.addLayer(ee.FeatureCollection(CurrentPoint).style(highlight), {},'CurrentPoint');
          }else if(key == 2021){
            var y_2021 = BT_all.select('b6').reduceRegion({
            geometry: y_point,
            scale: 0.6,
            reducer: ee.Reducer.mean()});
          y_status = y_2021.get('b6');   

            removeAllLayers();
            Map.addLayer(NAIP_2021, naVis, 'TrueColor-2021');
            Map.addLayer(NAIP_2021, fcVis, 'FalseColor-2021',false);
            Map.addLayer(NDWI_2021, ndwiVis, 'NDWI-2021',false);
            Map.addLayer(randomPoints,{palette: 'FFFFFF'}, 'Points');
            Map.addLayer(ee.FeatureCollection(CurrentPoint).style(highlight), {},'CurrentPoint');
          }
      } // closes updateMapDisplay function
          
      // Year drop down menu
      // get binary threshold value of year
      var select_Y = ui.Select({
        items: Object.keys(years),
        onChange: function(key) {
       updateMapDisplay(key); // Call the updateMapDisplay function with the selected year 
      
        // certainty options for dropdown menu 7/28/23
        var certaintyOptions = ['Uncertain','Certain'];

          // Added by André: New textbox for identifying water bodies. 6/12/23
        // Updated text options 7/31/23 for certain options:
        var waterBodyOptions = ['water - pond', 'water - river/stream', 'water - ditch', 'water - ocean', 'water - other waterbody', 'not water'];  // water body labels for when Certain
        
        // Updated 7/31/23 - Changing text for uncertain options
        var uncertaintyWaterOptions = [ 'water - pond',
                                        'water - river/stream', 
                                        'water - ditch',
                                        'water - ocean',
                                        'water - other waterbody',
                                        'not water - maybe pond', 
                                        'not water - maybe river/stream', 
                                        'not water - maybe ditch', 
                                        'not water - maybe ocean',
                                        'not water - maybe other waterbody']; //drop down labels for if selecting Uncertain

        // Updated 7/31/23 - Created a conditional in the certainty dropdown menu that will change the waterbody options of textbox3 depending on selection.
        // Added dropdown Certainty menu to replace previous textbox 7/28/23          
        var textbox2 = ui.Select({items: certaintyOptions,
          placeholder: 'Certain?',   // place holder label
          style: {color: '#666666'}, // dark grey
          onChange: function(text) {
            textbox2.style().set('color', 'black');   // change font color when selected
            t2 = ee.String(text);   // populate t2 with selected certainty
            if (t2.getInfo() == 'Uncertain') {          // conditional that changes textbox3 options depending on certainty
              t3 = undefined            // clears waterbody text if a selection had already been made
              panel_t.remove(textbox3); // Remove the old textbox3
              textbox3 = ui.Select({ items: uncertaintyWaterOptions, placeholder: 'Water?', style: {color: '#666666'}, onChange: function(text) {textbox3.style().set('color', 'black'); t3 = ee.String(text);}}); // Recreate the textbox3 with new items
              panel_t.add(textbox3); // Add the new textbox3 to the panel
            } else {
              t3 = undefined            // clears waterbody text if a selection had already been made
              panel_t.remove(textbox3); // Remove the old textbox3
              textbox3 = ui.Select({ items: waterBodyOptions, placeholder: 'Water?', style: {color: '#666666'}, onChange: function(text) {textbox3.style().set('color', 'black'); t3 = ee.String(text);}}); // Recreate the textbox3 with new items
              panel_t.add(textbox3); // Add the new textbox3 to the panel
            }
          }
        });
        
        // textbox 3 for water dropdown selection
        var textbox3 = ui.Select({items: waterBodyOptions,
         placeholder: 'Water?',
         style: {color: '#666666'}, // dark grey
         onChange: function(text) {
          textbox3.style().set('color', 'black');   // change font color when selected
          t3 = ee.String(text);}  // populate t3 with selected water option
          });

        
        var textbox4 = ui.Textbox({          
            placeholder: 'Enter notes',
            onChange: function(text) {
              no = ee.String(text);   // populate no with note text
                    }});
                    
        // UPDATED 8/17 FOR OPTIMIZATION---------------------------------------------------------
        // Save button
        var b1 = ui.Button({
        label: 'Save',
        style: {color: '#CC4400'},  // Set button font color to burnt orange
        onClick: function() {
          // Update certaintyValue based on dropdown selection
          var certaintyValue = (t2 === undefined || t2.getInfo() == 'Certain') ? 1 : 0;
          t2 = undefined; // Reset certainty dropdown
          
          // Update waterbodyValue and x_status based on dropdown selection
          // Get the value of t3 dropdown, or set it to 'not water' if undefined
          var t3Info = (t3 !== undefined) ? t3.getInfo() : 'not water';
          //Get value of t0, year, no to optimize code speed:
          var t0Info = t0.getInfo();
          var yearInfo = year.getInfo();
          var note = no.getInfo();
          
          var waterbodyValue = 'not water'; // Default value for waterbody
          var x_status = 0; // Default value for x_status (not water)
          
          if (t3Info === 'not water' || t3Info === 'not water - maybe pond' || t3Info === 'not water - maybe river/stream' || t3Info === 'not water - maybe ditch' || t3Info === 'not water - maybe ocean' || t3Info === 'not water - maybe other waterbody') {
            waterbodyValue = t3Info; // Set waterbodyValue if t3Info matches "not water" options
          } else {
            waterbodyValue = t3Info;
            x_status = 1; // Set x_status to 1 (water) for other waterbody values
          }
          t3 = undefined; // Reset waterbody dropdown
          
          // Update pond_presence based on dropdown selection
          var pond_presence = (t3Info !== 'water - pond') ? 0 : 1;
          
          // Check if the entry already exists in the data table when saving
          var alreadyExists = false;
          for (var i = 0; i < dataTable.length; i++) {
            var row = dataTable[i];
            if (row[1] === t0Info && row[5] === yearInfo) {
              alreadyExists = true;
              row[6] = certaintyValue;
              row[7] = waterbodyValue;
              row[8] = x_status;
              row[10] = pond_presence;
              row[11] = note;
              panel_t.remove(textbox2);
              panel_t.remove(textbox3);
              panel_t.remove(textbox4);
              panel_t.remove(b1);
              no = ee.String('');
              break;
            }
          }
          
          var y_statusValue = (y_status.getInfo()) - 1;
          
           // udated 7/28/23 to work with new dropdown menus, removed t4 and added x_status  
          if (!alreadyExists) {                     // added june 19, if point doesn't exist in table then save new point info
            dataTable1 = dataTable.concat([[
                st.getInfo(),     // strata, row 0
                t0Info,     // point ID, row 1
                t1.getInfo(),     // point ID_R, row 2
                c1.getInfo(),     // latitude, row 3
                c2.getInfo(),     // longitude, row 4
                yearInfo,   // year, row 5
                certaintyValue,   // certainty, row 6
                waterbodyValue,   // added waterbody textbox, row 7
                x_status,         // X (1 = water, 0 = not water) row 8
                y_statusValue,   // Y: map classification, row 9
                pond_presence,    // Pond presence or not? (1 = pond, 0 = not pond) row 10
                note              // note row 11 
                ]]);
            alreadyExists = false;               // added june 19, set alreadyExists back to false
            
            //Replace old table with new saved table    
            dataTable = dataTable1;
          }
          
          // Row entry for  subdata update table - ANDRE ADDED 5/27/2023
          // Updated 7/28/23 to work with new drop down menu
          var newRow = [
            t0Info,   // Andre changed from t1 (point_ID_R) to t0 (point_ID)
            yearInfo, // year
            certaintyValue,  // Certainty text
            waterbodyValue  // Waterbody text
          ];
          
          // Insert the new row below the header of the subdata table
          subdataTable.splice(1, 0, newRow);
              
          // Clear subdata panel after saving
          panel_dt.clear();
              
          //updated 7/28/23 to work with new dropdowns
          // populate subdata panel with table
          var chart1 = ui.Chart(subdataTable).setChartType('Table');
          panel_dt.add(chart1);      // updates chart in subata panel with newly saved point entry
          panel_t.remove(textbox2);  // remove certainty dropdown from point entry panel after saving
          panel_t.remove(textbox3);  // remove waterbody dropdown from point entry panel after saving
          panel_t.remove(textbox4);  // remove note dropdown from point entry panel after saving
          panel_t.remove(b1);        // remove save button from point entry panel after saving
          no = ee.String('');        // clears note 
            
          // Interface will change map and year on dropdown to the following year when you click the save button.
          //added 7/29/23 - Interface will now change map and year on dropdown to the following year when you click the save button.
          // After saving, find the current year in the dropdown menu
          var currentYear = select_Y.getValue();
      
          // Get the keys (years) from the dropdown menu
          var yearKeys = Object.keys(years);
      
          // Find the index of the current year
          var currentYearIndex = yearKeys.indexOf(currentYear);
      
          // If the current year is not the last year in the dropdown, change the dropdown to the next year
          if (currentYearIndex < yearKeys.length - 1) {
            var nextYear = yearKeys[currentYearIndex + 1];
            select_Y.setValue(nextYear);
            updateMapDisplay(nextYear);   // Also call the function that is executed when the year dropdown changes to update the map display
          } else {
            Map.remove(panel_t);          // if last year remove panel_t
          }
        }
        });// closes Save button code
        
        // count how many widgets on panel_t after selecting new year
        var twidgets = panel_t.widgets();
        
        // Update 7/31/23 Changed order of buttons
        // delete current widgets and replace them with clear ones when new year selected from dropdown
        if(twidgets.get(1)){         // if there are more than one widget on panel_t, remove all but the first
          panel_t.remove(textbox4);  // note textbox
          panel_t.remove(b1);        // save button
          panel_t.remove(textbox2);  // certainty dropdown
          panel_t.remove(textbox3);  // waterbody dropdown
        } else {                     // if there is only one widget on panel_t, add the rest
        panel_t.add(textbox4);
        panel_t.add(b1);
        panel_t.add(textbox2);  
        panel_t.add(textbox3);
        }
      }});  // closes Select_Y (year dropdown menu) button
  
      // blank sample point panel with just year dropdown
      var panel_x = ui.Panel({
        widgets: [
          select_Y
          ],
        layout: ui.Panel.Layout.flow('horizontal'),
        });
        panel_x.style().set({
          backgroundColor: '#00000000' // Hex code with 25% transparency
          });
        
      // create gui for entering sample point data, minus the year dropdown which is on panel_x
      var panel_t = ui.Panel({
        widgets: [
          panel_x,
          ],
        layout: ui.Panel.Layout.flow('horizontal'),
        });
        panel_t.style().set({
          width: '625px',           // june 13, Andre made panel bigger to include waterbody textbox
          position: 'top-center',
          backgroundColor: '#f3eddd80' // Hex code with 25% transparency
          });
  
        select_Y.setPlaceholder('  Choose a year  ');   // placeholder on year dropdown of panel t
        
        // checks how many panels on map to decide if to remove or add panel t
        var tpanels = Map.widgets();   
        if(tpanels.get(3)){       
           Map.remove(panel_t);    // remove panel_t if 4 panels, since panel_t already exists
        } else {
          Map.add(panel_t);       // add panel_t if only 3 panels
        }

   } // 376 bracket (on change)
  }); // closes select point function
  
  // Set a place holder for dropdown menu.
  select.setPlaceholder('  Choose a point  ');
  

  
  // Next point button  -----------------------------------------------------------------------------------------------  
  // optimized by adding numPoints 8-17-23
  var bn = ui.Button({
            label: 'Next Point',
            style: {color: '#9a009a', fontWeight: 'bold', border: '1px solid grey'},
            onClick: function() {
             if(op <  numPoints){op = op+1;}
              point_ID_R = op-1;  
              point_ID = r[op];
              t1 = ee.Number(point_ID_R); 
              
              // Next two lines added by Andre. Update the number in the dropdown menu without triggering the onChange event
              var updatedValue = (op).toString();
              select.setValue(updatedValue);
              
              // get point coordinates
              point_lon = places[op][0];
              point_lat = places[op][1];
              label_cp.setValue('Current Point: ' + (op+1)); // added +1, updates the Current Point label when click Next Point
              Map.setCenter(places[op][0], places[op][1],19);   // zoom to point
              removeLayer();
              CurrentPoint = ee.Geometry.Point(
                [ee.Number(places[op][0]).getInfo(), ee.Number(places[op][1]).getInfo()]);
                Map.addLayer(ee.FeatureCollection(CurrentPoint).style(highlight), {},'CurrentPoint');
                
            }});  // close NextPoint button code
  
  
  // create textbox for entering point value---------------------------------------------------------
  // Create a UI textbox for entering point ID
  var enterPoint = ui.Textbox({
  placeholder: 'Enter point ID', // Initial placeholder text
  style: { width: '100px' }, // Adjust the width of the textbox
  onChange: function(newText) {
    if (!isNaN(newText)) { // Check if entered text is a valid number
      var parsedNumber = parseInt(newText);
      if (parsedNumber >= 1 && parsedNumber <= Object.keys(places).length) {
        // Check if entered number is within valid range
        select.setValue((parsedNumber - 1).toString()); // Set the dropdown value
      } else {
        enterPoint.setValue(''); // Clear the textbox if invalid number
      }
      enterPoint.setValue(''); // Clear the textbox
    }} //close onChange
  });
  
  
  // create label--------------------------------------------------
  var labellink = ui.Label({
    value: 'Manual',
    style: { color: '484848', backgroundColor: '#00000000'},
    targetUrl: 'https://docs.google.com/document/d/1YZkV_SRI4DsqQL3gA_MyIchta8KrJPnBDmIQUEBsej0/edit?usp=sharing'
  });
  
  var label_cp = ui.Label({
    value: 'Current Point:',
    style: { color: '000000', fontWeight: 'bold', backgroundColor: '#00000000'}
  });
  
  
  // create panel---------------------------------------------------
  var panel = ui.Panel({
      widgets: [
          label_cp,
          select,
          bn,
          enterPoint,
          labellink
      ],
      style: {
          position: 'top-right',
          backgroundColor: '#f3eddd80' // Hex code with 25% transparency
      }
  });
  
  Map.add(panel);
            
}}); // closes function for when name entered at the beginning 

var panel_n = ui.Panel({
          widgets: [
            title,
            textbox_n
            ],
          layout: ui.Panel.Layout.flow('vertical'),
          });
          panel_n.style().set({
            position: 'top-center',
            backgroundColor: '#f3eddd'
            });
          
           Map.add(panel_n);


////Add map layers---------------------------------------------------------------------------


Map.addLayer(NAIP_2010, naVis, 'TrueColor-2010');
Map.addLayer(NAIP_2010, fcVis, 'FalseColor-2010',false);
Map.addLayer(NDWI_2010, ndwiVis, 'NDWI-2010',false);

Map.addLayer(randomPoints,{palette: 'FFFFFF'}, 'Points');
Map.centerObject(randomPoints,12);


// Code for exporting points --------------------------------------------------------------------

// // Define the export parameters
// var exportParameters = {
//   collection: randomPoints,
//   description: 'points_export', // Change this to your desired file name
//   folder: 'GEE_exports',        // Change this to your desired folder in Google Drive
//   fileFormat: 'SHP'             // You can also use other formats like GeoJSON
// };

// // Export the points to Google Drive
// Export.table.toDrive(exportParameters);

// // Print a success message
// print('Points have been exported to Google Drive');
