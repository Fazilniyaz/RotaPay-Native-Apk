// Vibrant palette (manager-supplied), aligned with RotoPay-Admin-WebApp tokens.
// Electric blue #2563EB · cyan #06B6D4 · violet #7C3AED (+ sky/light accents)
export const COLORS = {
    primary:          '#2563EB',   // electric blue — main brand
    primaryMid:       '#06B6D4',   // cyan — brighter accent
    secondary:        '#1D4ED8',   // blue-700 — deep
    tertiary:         '#7C3AED',   // violet — accent
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
    gradStart:        '#2563EB',   // electric blue → cyan vibrant gradient
    gradEnd:          '#06B6D4',
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
