var o = {
	init: function(){
		this.diagram();
	},
	random: function(l, u){
		return Math.floor((Math.random()*(u-l+1))+l);
	},
	diagram: function(){
		var r = Raphael('diagram', 460, 460), //position of text
			rad = 55,
			defaultText = 'Check my skills',
			speed = 250;
		
		r.circle(230, 200, 63).attr({ stroke: 'none', fill: '#102432', opacity: '.95' }); //position of center circle
		
		var title = r.text(230, 200, defaultText).attr({
			font: '14px Droid Sans',
			fill: '#fefefe',
			textAlign: 'center',
		}).toFront();
		
		r.customAttributes.arc = function(value, color, rad){
			var v = 3.6*value,
				alpha = v == 360 ? 359.99 : v,
				random = o.random(91, 240),
				a = (random-alpha) * Math.PI/180,
				b = random * Math.PI/180,
				sx = 230 + rad * Math.cos(b), //Position of elements
				sy = 200 - rad * Math.sin(b),
				x = 230 + rad * Math.cos(a),
				y = 200 - rad * Math.sin(a),
				path = [['M', sx, sy], ['A', rad, rad, 0, +(alpha > 180), 1, x, y]];
			return { path: path, stroke: color }
		}
		
		$('.get').find('.arc').each(function(i){
			var t = $(this), 
				color = t.find('.color').val(),
				value = t.find('.percent').val(),
				text = t.find('.text').text();
			
			rad += 20;	//Radius between elements
			var z = r.path().attr({ arc: [value, color, rad], 'stroke-width': 16, opacity: .25 });
			
			z.mouseover(function(){
                this.animate({ 'stroke-width': 32, opacity: .8 }, 900, 'elastic');
                if(Raphael.type != 'VML') //solves IE problem
				this.toFront();
				title.stop().animate({ opacity: 0 }, speed, '>', function(){
					this.attr({ text: text + ' ' + value/10 + '/10' }).animate({ opacity: 1 }, speed, '<');
				});
            }).mouseout(function(){
				this.stop().animate({ 'stroke-width': 16, opacity: .25 }, speed*4, 'elastic');
				title.stop().animate({ opacity: 0 }, speed, '>', function(){

				title.attr({ text: defaultText }).animate({ opacity: 1 }, speed, '<');
				});	
            });
		});
		
	}
}
$(function(){ o.init(); });
