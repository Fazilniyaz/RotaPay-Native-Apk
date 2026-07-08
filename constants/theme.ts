// Teal brand palette (manager-supplied), aligned with RotoPay-Admin-WebApp tokens.
// L1 #C8E6E2 · L2 #9ED5D1 · L3 #63C1BB · L4 #3A9295 · L5 #105F68
export const COLORS = {
    primary:          '#3A9295',   // L4 — main brand
    primaryMid:       '#63C1BB',   // L3 — brighter accent
    secondary:        '#105F68',   // L5 — deep teal
    tertiary:         '#105F68',   // L5
    error:            '#ba1a1a',
    surface:          '#fbf9f8',
    surfaceContainer: '#efeded',
    surfaceHigh:      '#eae8e7',
    surfaceHighest:   '#e4e2e2',
    surfaceLowest:    '#ffffff',
    onSurface:        '#1b1c1c',
    onSurfaceVar:     '#404752',
    outline:          '#707783',
    outlineVar:       '#c0c7d4',
    gradStart:        '#3A9295',   // L4 → L5 rich teal gradient
    gradEnd:          '#105F68',
};

export const FONTS = {
    regular:   'Montserrat_400Regular',
    medium:    'Montserrat_500Medium',
    semiBold:  'Montserrat_600SemiBold',
    bold:      'Montserrat_700Bold',
    extraBold: 'Montserrat_800ExtraBold',
};

export const RADIUS = {
    sm:   8,
    md:   10,
    lg:   12,
    xl:   16,
    xxl:  20,
    full: 999,
};

export const SHADOW = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    button: {
        shadowColor: COLORS.primaryMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
        elevation: 5,
    },
};
