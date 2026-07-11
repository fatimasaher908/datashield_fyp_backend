import {
    changePinService
} from "../services/pinServices.js";

export const changePin = async (req, res) => {
    try {

        const userId = req.user.id;

        const {
            oldPin,
            newPin
        } = req.body;

        if (!oldPin || !newPin) {
            return res.status(400).json({
                success: false,
                message: "Old PIN and new PIN are required."
            });
        }

        await changePinService(
            userId,
            oldPin,
            newPin
        );

        return res.json({
            success: true,
            message: "PIN changed successfully."
        });

    } catch (err) {

        return res.status(err.status || 500).json({
            success: false,
            message: err.message
        });

    }
};