App = {
	pageloaded: function() {
		console.log("page loaded");
		// $('#moreinfo').hide();
	}

};

$(App.pageloaded);


function moreinfo(panel) {

	var hgt = $('.'+panel).height();
	console.log(hgt);
	$('#moreinfo').height(hgt);
	$("#topexpertlist .profilepanel:not('."+panel+"')").hide();
	$( "#moreinfo" ).appendTo( "#topexpertlist > row" );

}