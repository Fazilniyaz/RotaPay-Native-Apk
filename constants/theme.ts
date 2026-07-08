// Blue brand palette (manager-supplied), aligned with RotoPay-Admin-WebApp tokens.
// B1 #D6E8EE · B2 #97CADB · B3 #018ABE · B4 #02457A · B5 #001B48
export const COLORS = {
    primary:          '#02457A',   // B4 — main brand
    primaryMid:       '#018ABE',   // B3 — brighter accent
    secondary:        '#001B48',   // B5 — deep navy
    tertiary:         '#001B48',   // B5
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
    gradStart:        '#018ABE',   // B3 → B4 cerulean→ocean gradient
    gradEnd:          '#02457A',
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
