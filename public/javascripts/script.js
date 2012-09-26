// jQuery Quicksand project categories filtering
// Thanks to Sacha Greif - http://www.sachagreif.com/


jQuery(document).ready(function($){
 	// Clone applications to get a second collection
	var $data = $(".portfolio-grid").clone();
	
	//NOTE: Only filter on the main portfolio page, not on the subcategory pages
	$('.filter li').click(function(e) {
		$(".filter li a").removeClass("active");	
		// Use the last category class as the category to filter by. This means that multiple categories are not supported (yet)
		var filterClass=$(this).attr('class').split(' ').slice(-1)[0];
		
		if (filterClass == 'all-projects') {
			var $filteredData = $data.find('.project');
		} else {
			var $filteredData = $data.find('.project[data-type=' + filterClass + ']');
		}
		
		$(".portfolio-grid").quicksand($filteredData, {
			duration: 400,
			easing: 'swing'
		});		
		
		$(this.children).addClass("active"); 			
		return false;
	});
});

			function clickFocus(input){
				if (input.value == input.defaultValue){
				input.value = '';
				}
			};

			function unFocus(input){
				if (input.value == ''){
				input.value = input.defaultValue;
				}
			};
