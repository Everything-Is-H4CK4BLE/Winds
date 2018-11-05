import Note from '../models/note';

exports.list = async (req, res) => {
	const query = req.query || {};
	if (query.sort !== 'recent') return res.json(await Note.find({ user: req.user.sub }));

	const recents = await Note.find({ user: req.user.sub })
		.sort({ updatedAt: -1 })
		.limit(20)
		.lean();

	const articleIds = recents.filter((n) => !!n.article).map((n) => n.article);
	const episodeIds = recents.filter((n) => !!n.episode).map((n) => n.episode);

	const notes = await Note.find({
		user: req.user.sub,
		$or: [{ article: { $in: articleIds } }, { episode: { $in: episodeIds } }],
	}).sort({ updatedAt: -1 });

	res.json(notes);
};

exports.listArticleNotes = async (req, res) => {
	res.json(
		await Note.find({ user: req.user.sub, article: req.params.articleId }).lean(),
	);
};

exports.listEpisodeNotes = async (req, res) => {
	res.json(
		await Note.find({ user: req.user.sub, episode: req.params.episodeId }).lean(),
	);
};

exports.get = async (req, res) => {
	const note = await Note.findById(req.params.noteId);
	if (!note) return res.status(404).json({ error: 'Resource does not exist.' });
	if (note.user._id != req.user.sub) return res.sendStatus(403);
	res.json(note);
};

exports.post = async (req, res) => {
	const data = {
		user: req.user.sub,
		article: req.body.article,
		episode: req.body.episode,
		start: req.body.start,
		end: req.body.end,
		text: req.body.text || '',
	};

	if (data.start == undefined || data.end == undefined)
		return res.status(422).json({ error: 'missing start|end offset' });
	if (!data.article && !data.episode)
		return res.status(422).json({ error: 'missing article||episode id' });

	const note = await Note.create(data);
	res.json(await Note.findById(note._id));
};

exports.put = async (req, res) => {
	const noteId = req.params.noteId;

	const note = await Note.findById(noteId).lean();
	if (!note) return res.status(404).json({ error: 'Resource does not exist.' });
	if (note.user._id != req.user.sub) return res.sendStatus(403);

	const start = req.body.start || note.start;
	const end = req.body.end || note.end;
	const text = req.body.text || note.text || '';

	res.json(await Note.findByIdAndUpdate(noteId, { start, end, text }, { new: true }));
};

exports.delete = async (req, res) => {
	const note = await Note.findById(req.params.noteId);
	if (!note) return res.status(404).json({ error: 'Resource does not exist.' });
	if (note.user._id != req.user.sub) return res.sendStatus(403);
	await note.remove();
	res.sendStatus(204);
};