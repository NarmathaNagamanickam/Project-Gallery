import { Component } from '@angular/core';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.css']
})
export class GalleryComponent {
  images = ['assets/images/img1.jpg', 'assets/images/img2.jpg', 'assets/images/img3.jpg', 'assets/images/img4.jpg', 'assets/images/img5.jpg', 'assets/images/img6.jpg', 'assets/images/img7.jpg', 'assets/images/img8.jpg', 'assets/images/img9.jpg', 'assets/images/img10.jpg', 'assets/images/img11.jpg', 'assets/images/img12.jpg', 'assets/images/img13.jpg', 'assets/images/img14.jpg', 'assets/images/img15.jpg', 'assets/images/img16.jpg', 'assets/images/img17.jpg', 'assets/images/img18.jpg', 'assets/images/img19.jpg', 'assets/images/img20.jpg', 'assets/images/img21.jpg', 'assets/images/img22.jpg'];
  currentIndex: number = 0;

  ngAfterViewInit(): void {
    const carousel = document.getElementById('galleryCarousel');
    if (carousel) {
      carousel.addEventListener('slid.bs.carousel', (event: any) => {
        this.currentIndex = event.to;
      });
    }
  }
}
