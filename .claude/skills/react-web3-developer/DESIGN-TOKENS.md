# OpenWork Design Tokens Reference

## Colors

### Brand Colors
| Name | Hex | Display P3 | Usage |
|------|-----|-----------|-------|
| Primary Blue | `#0047FF` | `color(display-p3 0.0706 0.2745 1)` | Primary actions, links |
| Secondary Blue | `#3971FF` | `color(display-p3 0.2793 0.4374 1)` | Gradients, borders |
| Border Blue | `#3f69ff` | - | Button borders |

### Text Colors
| Name | Hex | Display P3 | Usage |
|------|-----|-----------|-------|
| Dark | `#4D4D4D` | `color(display-p3 0.302 0.302 0.302)` | Headings, primary text |
| Gray | `#868686` | `color(display-p3 0.525 0.525 0.525)` | Secondary text |
| Light Gray | `#767676` | `color(display-p3 0.463 0.463 0.463)` | Captions |
| Muted | `#B3B3B3` | - | Placeholder text |

### UI Colors
| Name | Hex | Usage |
|------|-----|-------|
| Border Light | `#f7f7f7` | Form borders |
| Divider | `#EAECF0` | Dividers, separators |
| Background | `#FEFEFE` | Card backgrounds |
| White | `#FFFFFF` | Pure white |
| Error Red | `#CA2C17` | Error states, badges |

### Gradient Definitions
```css
/* Primary Button Gradient */
background: linear-gradient(180deg, #0047FF -23.96%, #3971FF 134.37%);
background: linear-gradient(180deg, color(display-p3 0.0706 0.2745 1) -23.96%, color(display-p3 0.2793 0.4374 1) 134.37%);

/* Secondary Button Gradient */
background: linear-gradient(180deg, #F4F4F4 0%, #FEFEFE 100%);
background: linear-gradient(180deg, color(display-p3 0.9569 0.9569 0.9569) 0%, color(display-p3 0.9961 0.9961 0.9961) 100%);
```

## Typography

### Font Family
```css
font-family: 'Satoshi', sans-serif;
```

### Font Weights
- Regular: 400
- Medium: 500
- Bold: 700

### Type Scale
| Name | Size | Weight | Line Height | Letter Spacing |
|------|------|--------|-------------|----------------|
| Heading Large | 20px | 700 | 27px | 0.02em |
| Body | 16px | 400 | 28px | 0.02em |
| Body Medium | 16px | 500 | 24px | - |
| Small | 14px | 500 | 24px | - |
| Caption | 12px | 400 | 16px | 0.04em |
| Tiny | 10px | 400 | - | - |

## Spacing

### Padding
| Size | Value |
|------|-------|
| xs | 4px |
| sm | 8px |
| md | 14px |
| lg | 20px |
| xl | 24px |
| 2xl | 32px |

### Gap
| Size | Value |
|------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 30px |

### Margins
| Context | Value |
|---------|-------|
| Section | 16px |
| Form field | 24px |

## Border Radius
| Name | Value | Usage |
|------|-------|-------|
| Small | 12px | Buttons, inputs |
| Large | 24px | Cards, forms |
| Circle | 50% | Avatars, badges |

## Shadows
```css
/* Light Shadow */
box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);

/* Medium Shadow */
box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);

/* Subtle Shadow */
box-shadow: 0px 0px 0.386px 1.158px rgba(0, 0, 0, 0.05),
            0px 4.634px 5.02px -2.317px rgba(0, 0, 0, 0.10);
```

## Layout

### Header
- Height: 80px
- Padding: 0 55px
- Border: 2px solid whitesmoke

### Container
- Max width: calc(100vh - 80px)
- Sidebar logo position: left: 78px

### Z-Index Scale
| Layer | Value |
|-------|-------|
| Base | 1 |
| Elevated | 2 |
| Overlay | 3 |
| Dropdown | 10 |

## Transitions

### Duration
| Speed | Value |
|-------|-------|
| Fast | 0.3s |
| Normal | 0.5s |
| Slow | 0.8s |
| Animation | 1s |

### Easing
```css
/* Standard */
transition: all 0.3s ease;

/* Smooth out */
transition: opacity 0.5s ease-out;

/* Smooth in-out */
transition: opacity 0.8s ease-in-out;
```

## Icon Sizes
| Size | Value |
|------|-------|
| Small | 18px |
| Medium | 20px |
| Large | 40px |

## Component Dimensions

### Buttons
- Padding: 8px 14px
- Border: 4px solid
- Min height: 40px

### Inputs
- Height: ~45px
- Padding: 12px 16px

### Dropdowns
- Width: 208px
- Padding: 20px 24px

### Badges
- Size: 20px × 20px
- Font size: 10px

## Multi-Chain Colors (for chain indicators)

| Chain | Color Suggestion |
|-------|------------------|
| Base Sepolia | Blue (#0047FF) |
| Arbitrum Sepolia | Orange (#FF7A00) |
| OP Sepolia | Red (#FF0420) |
| Ethereum Sepolia | Purple (#627EEA) |
