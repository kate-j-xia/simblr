let grid = document.querySelector('.grid');
let msnry = new Masonry(grid, {
    itemSelector: '.none',
    columnWidth: '.grid__col-sizer',
    gutter: '.grid__gutter-sizer',
    percentPosition: true,
    stagger: 30,
});

imagesLoaded(
    grid, function() {
        grid.classList.remove('are-images-unloaded');
        msnry.options.itemSelector = '.grid__item';
        let items = grid.querySelectorAll('.grid__item');
        msnry.appended(items);
    }
)
