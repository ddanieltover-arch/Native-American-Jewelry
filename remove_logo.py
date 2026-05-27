import cv2
import numpy as np
import glob
import os

def remove_logo_from_image(img_path, logo_path, output_path):
    print(f"Processing {img_path}...")
    img = cv2.imread(img_path)
    logo = cv2.imread(logo_path)
    
    if img is None or logo is None:
        print(f"Error loading images for {img_path}")
        return

    # Initialize SIFT detector
    sift = cv2.SIFT_create()
    
    # Find the keypoints and descriptors with SIFT
    kp1, des1 = sift.detectAndCompute(logo, None)
    kp2, des2 = sift.detectAndCompute(img, None)
    
    if des1 is None or des2 is None:
        print(f"Not enough features found in {img_path}")
        return
        
    # FLANN parameters for matching
    FLANN_INDEX_KDTREE = 1
    index_params = dict(algorithm = FLANN_INDEX_KDTREE, trees = 5)
    search_params = dict(checks = 50)
    flann = cv2.FlannBasedMatcher(index_params, search_params)
    
    matches = flann.knnMatch(des1, des2, k=2)
    
    # Store all the good matches as per Lowe's ratio test
    good = []
    for match in matches:
        if len(match) == 2:
            m, n = match
            if m.distance < 0.85 * n.distance:
                good.append(m)
            
    if len(good) > 10:
        src_pts = np.float32([ kp1[m.queryIdx].pt for m in good ]).reshape(-1, 1, 2)
        dst_pts = np.float32([ kp2[m.trainIdx].pt for m in good ]).reshape(-1, 1, 2)
        
        # Find homography
        M, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        
        if M is not None:
            # Get the corners of the logo image
            h, w = logo.shape[:2]
            pts = np.float32([ [0, 0], [0, h-1], [w-1, h-1], [w-1, 0] ]).reshape(-1, 1, 2)
            
            # Project corners into the target image
            dst = cv2.perspectiveTransform(pts, M)
            
            # Create a mask for inpainting
            mask_img = np.zeros(img.shape[:2], dtype=np.uint8)
            cv2.fillPoly(mask_img, [np.int32(dst)], 255)
            
            # Dilate the mask to ensure we cover the edges of the logo
            kernel = np.ones((7, 7), np.uint8)
            mask_img = cv2.dilate(mask_img, kernel, iterations=3)
            
            # Additional mask for the website text usually below the logo. 
            # We can expand the bounding box downwards by some amount relative to the logo height.
            bbox = cv2.boundingRect(np.int32(dst))
            x, y, bw, bh = bbox
            # Create a larger rectangular mask covering the logo and area below it
            # The website is usually directly below the logo
            y_start = max(0, y - 10)
            y_end = min(img.shape[0], y + int(bh * 1.5))
            x_start = max(0, x - 20)
            x_end = min(img.shape[1], x + bw + 20)
            
            rect_mask = np.zeros(img.shape[:2], dtype=np.uint8)
            cv2.rectangle(rect_mask, (x_start, y_start), (x_end, y_end), 255, -1)
            
            # Combine SIFT poly mask and rectangular mask (or just use the rect mask for cleaner area)
            final_mask = rect_mask
            
            # Inpaint
            result = cv2.inpaint(img, final_mask, 5, cv2.INPAINT_TELEA)
            
            cv2.imwrite(output_path, result)
            print(f"Successfully processed and saved to {output_path}")
        else:
            print(f"Homography could not be calculated for {img_path}")
    else:
        print(f"Not enough matches are found - {len(good)}/10 for {img_path}")

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        output_path = sys.argv[2] if len(sys.argv) > 2 else 'output_' + os.path.basename(img_path)
        logo_file = 'logo.png'
        if not os.path.exists(os.path.dirname(output_path)) and os.path.dirname(output_path) != '':
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
        remove_logo_from_image(img_path, logo_file, output_path)
    else:
        print("Usage: python remove_logo.py <input_image> <output_image>")
