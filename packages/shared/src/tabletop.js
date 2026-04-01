export const NORMALIZED_BOARD_MIN = 0;
export const NORMALIZED_BOARD_SIZE = {
    width: 1,
    height: 1
};
export const SESSION_ROLES = ["host", "editor", "spectator"];
export function isSessionRole(value) {
    return SESSION_ROLES.includes(value);
}
export function createEmptySessionState(args) {
    const now = args.now ?? new Date().toISOString();
    return {
        sessionId: args.sessionId,
        title: args.title,
        mediaSource: null,
        calibration: null,
        assets: args.assets ?? {},
        pieces: {},
        users: args.users ?? {},
        createdAt: now,
        updatedAt: now
    };
}
export function isNormalizedBoardPoint(point) {
    return (Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        point.x >= NORMALIZED_BOARD_MIN &&
        point.x <= NORMALIZED_BOARD_SIZE.width &&
        point.y >= NORMALIZED_BOARD_MIN &&
        point.y <= NORMALIZED_BOARD_SIZE.height);
}
