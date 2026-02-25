// Picture taking and saving functionality
// Extracted from blockscad.js lines ~582-660

const B = window.Blockscad;

export function takeRPic() {
  if (B.gProcessor != null) {
    var strip = B.gProcessor.imgStrip;
    if (strip)
      savePic(strip, $('#project-name').val() + '.jpg');
  }
}

export function savePic(image, name) {
  if (image) {
    var bytestream = atob(image.split(',')[1]);
    var mimestring = image.split(',')[0].split(':')[1].split(';')[0];

    var ab = new ArrayBuffer(bytestream.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < bytestream.length; i++) {
      ia[i] = bytestream.charCodeAt(i);
    }

    var blob = new Blob([ab], {type: "img/jpeg"});
    saveAs(blob, name);
  }
}

export function takePic() {
  if (B.gProcessor) {
    if (B.gProcessor.img && B.gProcessor.img != "null")
      savePic(B.gProcessor.img, $('#project-name').val() + '.jpg');
  }
}

export function cameraPic() {
  if (B.gProcessor.viewer) {
    var image = B.gProcessor.viewer.takeCameraPic(.95);
    if (image)
      savePic(image, $('#project-name').val() + '.jpg');
  }
}
