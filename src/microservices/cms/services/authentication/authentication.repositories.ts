import { Request, Response, NextFunction } from "express";
import User from "../users/users.model";
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ErrorResponse = require("@/middleware/Error/error.response");
const { Op } = require("sequelize");

class UserRepository {
	constructor() {}

	public async register(req: Request, res: Response, next: NextFunction) {
		try {
			await User.create(
				{
					...req.body,
				},
				{
					fields: [
						"first_name",
						"last_name",
						"username",
						"password",
						"gender",
						"display_picture",
						"email",
						"phone",
					],
				}
			);

			res.status(201).json({
				success: true,
				message: "User created successfully",
			});
		} catch (error) {
			next(error);
		}
	}

	public async login(req: Request, res: Response, next: NextFunction) {
		try {
			const { phone, password } = req.body;
			if (!phone || !password)
				return next(
					new ErrorResponse("Please provide email and password", 400)
				);

			const data = await User.findAll({
				where: {
					phone,
				},
			});
			if (!data.length) return next(new ErrorResponse("No user found", 404));

			const user = data[0];

			if (!user.is_active)
				return next(
					new ErrorResponse(
						"Your user account is suspended. Please contact with helpline.",
						400
					)
				);

			if (!user.verified_at)
				return next(
					new ErrorResponse("Your user account is not verified yet.", 400)
				);

			if (!(await bcrypt.compare(password, user.password)))
				return next(new ErrorResponse("Incorrect Password", 401));

			res.status(200).json({
				success: true,
				token: jwt.sign({ id: user.id, admin: false }, process.env.JWT_SECRET, {
					expiresIn: process.env.JWT_EXPIRE,
				}),
				message: `Welcome ${user.first_name} ${user.last_name}!!`,
			});
		} catch (error) {
			next(error);
		}
	}

	public async validate(req: Request, res: Response, next: NextFunction) {
		let token;

		if (
			req.headers.authorization &&
			req.headers.authorization.startsWith("Bearer")
		) {
			token = req.headers.authorization.split(" ")[1];
		}

		if (!token) return next(new ErrorResponse("Unauthorized user!", 401));

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			if (!decoded.id)
				return next(new ErrorResponse("Unauthorized user!", 401));

			var user = await User.findOne({
				where: {
					id: decoded.id,
					is_active: true,
					verified_at: {
						[Op.ne]: null,
					},
				},
			});

			if (!user) return next(new ErrorResponse("No user found!", 404));

			res.status(200).json({
				success: true,
				message: "User is authenticated.",
				data: {
					id: user.id,
					first_name: user.first_name,
					last_name: user.last_name,
					username: user.username,
					gender: user.gender,
					display_picture: user.display_picture,
					email: user.email,
					phone: user.phone,
					default_address: user.default_address,
					is_active: user.is_active,
					verified_at: user.verified_at,
					created_at: user.created_at,
					updated_at: user.updated_at,
					deleted_at: user.deleted_at,
				},
			});
		} catch (error) {
			next(error);
		}
	}
}

/*
"id": 7,
        "first_name": "Ibrahim Sadik",
        "last_name": "Tamim",
        "username": "tam11a",
        "password": "$2a$10$vcP.DbbKKV/Ca2qNd.Jcg.QPVvj.aKQamZm1lN3O06PiqIozeF5Bq",
        "gender": "Male",
        "display_picture": null,
        "email": "ibrahimsadiktamim@gmail.com",
        "phone": "01768161994",
        "default_address": null,
        "is_active": true,
        "is_verified": false,
        "created_at": "2023-07-25T18:04:55.000Z",
        "updated_at": "2023-07-25T18:04:55.000Z",
        "deleted_at": null
*/
export default UserRepository;