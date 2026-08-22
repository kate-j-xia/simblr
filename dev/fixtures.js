/* Dev-only. Injects placeholder posts that mimic Tumblr's rendered output,
   so css/ and js/ can be checked without pasting theme.html into Tumblr. */

const params = new URLSearchParams(location.search);
const section = document.querySelector('section.posts');
section.dataset.pageKind = params.get('kind') || '';
section.dataset.tag = params.get('tag') || '';

function img(w, h) {
    return `https://placehold.co/${w}x${h}/eeeeee/999999.png`;
}

const POSTS = [
    `<div class="title">A text post with a title</div>
     <li class="comment ted">Body copy for the text post. It should wrap across a
     couple of lines so line-height and measure are visible.</li>`,

    `<div class="media"><div class="ph"><img src="${img(500, 700)}" alt=""></div></div>
     <li class="comment"><a href="#" class="user">someblog</a>A photo caption.</li>`,

    `<div class="media"><div class="ph">
       <div class="photo-slideshow" data-layout="21">
         <img src="${img(500, 400)}" alt=""><img src="${img(500, 400)}" alt="">
         <img src="${img(500, 300)}" alt="">
       </div></div></div>
     <li class="comment"><a href="#" class="user">buildblog</a>A photoset caption.</li>`,

    // A reblogged photo post. Tumblr renders the photo through {block:Photo}
    // AND again inside the root trail entry's {Body}, so the same image appears
    // twice. removeDuplicateTrailImages() should strip the trail copy and leave
    // only the reblogger's comment. These use one identical URL; the
    // same-image-at-different-sizes case is covered in js/theme.test.js.
    `<div class="media"><div class="ph"><img src="${img(500, 500)}" alt=""></div></div>
     <li class="comment"><a href="#" class="user">originalblog</a>
       <figure class="tmblr-full"><img src="${img(500, 500)}" alt=""></figure>
       The original poster's caption.</li>
     <li class="comment"><a href="#" class="user">kate</a>My reblog comment &mdash;
       this is the only thing that should survive below the photo.</li>`,

    `<div class="quote title">A pull quote, set larger than body copy.</div>
     <div class="source">&mdash; someone</div>`,

    `<div class="q"><span class="as">anon sent: </span>Do you take build requests?</div>
     <li class="comment"><span class="user">kate replied: </span>Sometimes! Send me a lot size.</li>`,

    `<ol class="chat">
       <li class="l"><span class="label">A:</span> first line</li>
       <li class="l"><span class="label">B:</span> second line</li>
     </ol>`,
];

const TAG_SVG = `<svg viewBox="0 0 216 216" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M95.2,186c1.7,0,3.2-0.6,4.3-1.7l64.8-66.7c2.3-2.4,2.3-6.1-0.1-8.4L94.7,39.7c-1.1-1.1-2.7-1.7-4.2-1.7l-67.1,0.1c-3.3,0-6,2.6-6,5.9L17,109.9c0,1.6,0.6,3.2,1.8,4.3l72.3,70.2C92.2,185.5,93.7,186,95.2,186z M29.4,50L88,49.8l63.6,63.6l-56.5,58.2L29,107.4L29.4,50z M67.1,77.7c0,4.6-3.8,8.4-8.4,8.4s-8.4-3.8-8.4-8.4c0-4.6,3.8-8.4,8.4-8.4S67.1,73.1,67.1,77.7z"/></svg>`;

const FOOTER = `
    <div class="when">
        Posted on <a href="#">August 21st, 2026</a>
        <span class="ca"><img src="${img(40, 40)}" alt=""></span>
        originally by <a href="#">someblog</a>
        ${params.get('kind') === 'permalink' ? `<div class="tags">
            ${TAG_SVG}<a href="#">ts2 builds</a><a href="#">download</a>
        </div>` : ''}
    </div>
    <div class="post-btns">
        <a href="#" title="permalink"><span class="material-symbols-outlined post-icon icon-permalink">left_click</span></a>
        <a href="#" title="reblog"><span class="material-symbols-outlined post-icon icon-reblog">cheer</span></a>
        <span class="like-btn" title="like"><span class="material-symbols-outlined post-icon icon-like">kid_star</span></span>
    </div>`;

POSTS.forEach((body, i) => {
    const article = document.createElement('article');
    article.className = 'posts';
    article.id = `post-${i}`;
    article.setAttribute('root-url', `https://example.com/post/${i}`);
    article.dataset.tags = '';
    article.innerHTML = body + FOOTER;
    section.appendChild(article);
});
