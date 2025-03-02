# Mike Brown Law - "Fender Bender Defender" Game
## Implementation Guide for Cursor

This README provides instructions for implementing the Sega Genesis-style personal injury law game for Mike Brown Law using Cursor.

## Overview

This is a complete, self-contained HTML file that includes:
- HTML structure
- CSS styling
- JavaScript for game logic
- SVG-based graphics

## Implementation Steps

1. **Create a new HTML file in Cursor**:
   - Create a new file named `index.html` or `game.html`
   - Copy and paste the ENTIRE code from the artifact into this file
   - Save the file

2. **No external dependencies required**:
   - All graphics are created using inline SVGs
   - No external images or libraries needed
   - Everything is contained in the single HTML file

3. **Testing the game**:
   - Open the HTML file in a web browser
   - You should see the title screen with "MIKE BROWN LAW" and the Start Game button
   - All game functionality should work as expected

## Game Controls & Features

- **Controls**: Use UP/DOWN arrow keys to change lanes
- **Objective**: Drive and survive as long as possible before the inevitable rear-ending
- **Game Flow**:
  - Start screen → Highway driving → Rear-end crash → Decision to call
  - Calling Mike Brown Law leads to the "win" screen
  - Handling it yourself leads to the "lose" screen

## Customization Options

If you want to make changes to the game:

### Modifying Contact Information
```javascript
// Find this section in the HTML code
<div id="law-contact">
    <p>Contact us now for your real case:</p>
    <p>Phone: (555) MIKE-LAW</p>
</div>
```

### Changing Game Difficulty
```javascript
// Find these variables in the JavaScript section
const crazyDriverTime = Math.floor(Math.random() * 10000) + 15000; // When crash happens (15-25s)
```

### Modifying Colors/Styling
```css
/* Find these color variables in the CSS section */
h1 {
    font-size: 48px;
    color: #ff0; /* Yellow title text */
    text-shadow: 4px 4px 0 #f00; /* Red text shadow */
    margin-bottom: 30px;
}
```

## Integration with Your Website

To add this game to your law firm's website:

1. **Standalone Page**: Create a dedicated page that contains only this HTML file
2. **Embed in Existing Page**: Use an iframe to embed the game on your site
   ```html
   <iframe src="game.html" width="640" height="480" frameborder="0"></iframe>
   ```
3. **Modal Pop-up**: Create a button that opens the game in a modal window

## Troubleshooting

- **Game not starting**: Make sure JavaScript is enabled in the browser
- **Controls not working**: Ensure keyboard focus is on the game window
- **Graphics issues**: Try a different browser if SVGs aren't rendering correctly

## Browser Compatibility

The game works on all modern browsers:
- Chrome
- Firefox
- Safari
- Edge

## Final Notes

- All game assets are contained within the single HTML file using SVG
- No external resources are needed
- The design is fully responsive and maintains the Sega Genesis aesthetic
- The game is designed to be straightforward while delivering your marketing message

For any questions or assistance with implementation, please contact your web developer.