App = {
	pageloaded: function() {
		console.log("page loaded");
		// $('#moreinfo').hide();


		$("#searchbtn").click(function (event){
			var topic = $("#topicfield").val();
			console.log("searchbtn clicked and searching for " + topic);

			$.get('/api/searchtopic', {topic: topic}, function (data){
				if(data.err) return console.log(data.err);
				var experts = data;

				console.log(experts); //hiermee de pagina populeren
			});
		});
	}

};


$(App.pageloaded);


function moreinfo(panel) {

	var hgt = $('.'+panel).height();
	console.log(hgt);
	$('#moreinfo').height(hgt);
	$("#topexpertlist .profilepanel:not('."+panel+"')").hide();
	$( "#moreinfo" ).appendTo( "#topexpertlist > row" );
	$('.'+panel).removeClass('')
}