function googleAPIError() {
	alert("Failed to load Google Maps API");
}

function ViewModel() {

	var self = this;

	self.map = null;
	self.apiSuccessful = null;
	self.currentInfoWindow = null;
	self.markers = ko.observableArray();

	self.query = ko.observable("");
	self.results = ko.observableArray();

	self.filterLocations = function() {
		var results = [];

		var query = self.query().toLowerCase();

		data.forEach(function(location) {
			if (location.stadium_name.toLowerCase().includes(query)) {
				results.push(location);
			}
		});

		return results;
	};

	// Update List based on query
	self.updateList = function(data) {
		self.results(self.filterLocations());
		self.clearMarkers();
		self.updateMarkers(self.filterLocations());
	};

	// Clear Markers which are not part of the query
	self.clearMarkers = function() {
		self.markers().forEach(function (marker, i) {
		    marker.setMap(null);
		});
		self.markers.removeAll();
	};

	// Update markers which may belong query
	self.updateMarkers = function(filterLocations) {
		filterLocations.forEach(function (location) {
			location.marker = new google.maps.Marker({
		        map: self.map,
		        position: location.coordinates,
		        animation: null
		    });

		    location.marker.addListener('click', function() {
	    		self.selectedLocation(location);
	    	});

		   	self.markers().push(location.marker);

		});
	};

	self.selectedLocation = function(location) {

		// Show the the Info Window of stadium
		self.showStadiumInfo(location);

		// Position the current Info Window to the center of the map
		self.map.setCenter(location.marker.getPosition());

		// Animate the marker of the selected location
		self.animate(location.marker);

	};

	self.showStadiumInfo = function(location) {

		// Close the windows which are opened
		if (self.currentInfoWindow !== null) {
		    self.currentInfoWindow.close();
		}

		// Set the content of the Info Window of the stadium
		location.infoWindow = new google.maps.InfoWindow({
			content: self.getHTML(location)
		});

		// Set the content of the stadium's Info Window to the current Info Window
		self.currentInfoWindow = location.infoWindow;

		// Open the current Info Window of the stadium
		self.currentInfoWindow.open(self.map, location.marker);

	};

	self.getHTML = function(location) {

		var template = '<h1>$stadium_name</h1>$wiki';

		var wikiTemplate = '$img' + '<p>' + '$wiki' + '</p>';

		var wiki = '';

		if (location.wiki !== undefined) {
			wiki = wikiTemplate.replace('$wiki', "<h5>Wikipedia: </h5>" + location.wiki).replace('$img', 'Failed to load image');
			if (location.img !== undefined) {
				wiki = wikiTemplate.replace('$wiki', "<h5>Wikipedia: </h5>" + location.wiki).replace('$img', location.img);
			}
		} else {
			self.getWikiInfo(location);
		}

		var html = template.replace('$stadium_name', location.stadium_name).replace('$wiki', wiki);

		return html;
	};

	self.getWikiInfo = function(location) {

		// Wikipedia Information of the stadium
		var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + location.stadium_name + '&format=json';

		// Ajax Call
		$.ajax({
		    url: wikiUrl,
		    dataType: 'jsonp',
		    success: function(response) {
		    	if (response[2][0] !== undefined) {
			    	location.wiki = response[2][0];
			    	location.infoWindow.setContent(self.getHTML(location));
		    	}
					else {
						location.wiki = "No wikipedia info found for this stadium";
			    	location.infoWindow.setContent(self.getHTML(location));
					}
		    },
		    timeout: 10000,
		    error: function() {
		    	if (self.apiSuccessful !== false) {
		    		alert("Wikipedia API Failed to load");
		    		self.apiSuccessful = false;
		    	}
		    }
		});

		// Wikipedia Thumbnail
		$.getJSON("http://en.wikipedia.org/w/api.php?action=query&format=json&callback=?", {
			titles: location.stadium_name,
			prop: "pageimages",
			pithumbsize: 500,
			pilimit: 10
		},
		function(data) {
			var source = "";
			var img = "";
			var imageUrl = GetImgUrl(data.query.pages);
			if (imageUrl === "") {
				img = "No Image Found";
				location.img = img;
			} else {
				img = "<img src=\"" + imageUrl + "\">";
				location.img = img;
			}
		}
		);

		function GetImgUrl(data) {
			var img_urli = "";
			for (var key in data) {
				if (data[key].thumbnail !== undefined) {
					if (data[key].thumbnail.source !== undefined) {
						img_urli = data[key].thumbnail.source;
						break;
					}
				}
			}
			return img_urli;
		}

	};

	// Bounce the marker of the selected stadium
	self.animate = function(marker) {
		if (marker.getAnimation() !== null) {
		  marker.setAnimation(null);
		} else {
		  marker.setAnimation(google.maps.Animation.DROP);
		}
	};

	// Initialize the Map based on the static latitude and longitude
	self.initMap = function() {
		self.map = new google.maps.Map(document.getElementById('map'), {
			center: {lat:17.385044, lng: 78.486671},
			zoom: 5,
			mapTypeControl: false

		});
	};
}


var viewModel;

function initialize() {

	viewModel = new ViewModel();

	viewModel.initMap();
	viewModel.updateList();

	// Activate Knockout
	ko.applyBindings(viewModel, document.getElementById("list"));
}
