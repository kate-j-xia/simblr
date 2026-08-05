let grid = document.querySelector('.grid');
let msnry = new Masonry(grid, {
    itemSelector: '.none',
    columnWidth: '.grid__col-sizer',
    gutter: '.grid__gutter-sizer',
    percentPosition: true
    stagger: 30,
});

imageLoaded(
    grid, function() {
        grid.classList.remove('are-images-unloaded');
        msnry.options.itemSelector = '.grid__item';
        let items = grid.querySelectorAll('.grid__item');
        msnry.appended(items);
    }
)

let infScroll = new InfiniteScroll(
    grid, { 
        path: '.pagination__next',
        append: '.grid__item',
        outlayer: msnry,
        status: '.page-load-status',
        historyTitle: false,
    }
);